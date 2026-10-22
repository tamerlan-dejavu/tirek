"""
Demo data for local development and design review. Never run against production.

Creates two independent providers, one ОСИ, four buildings and a realistic slice of the
workflow (approved/submitted/scheduled inspections, defects R1–R4 in different statuses,
work orders, observations and histories). Every demo building is labelled «ДЕМО».
"""

from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.buildings.models import (
    Building,
    BuildingElement,
    Presence,
    StructuralScheme,
)
from apps.buildings.services import ensure_passport
from apps.checklists.models import (
    AnswerType,
    ChecklistItem,
    ChecklistTemplate,
    ChecklistTemplateVersion,
)
from apps.defects.models import Defect, DefectEvent, DefectObservation, DefectStatus
from apps.inspections.models import (
    ComplianceValue,
    Inspection,
    InspectionAnswer,
    InspectionReview,
    InspectionStatus,
)
from apps.notifications.models import Notification, NotificationKind
from apps.organizations.models import (
    BuildingAssignment,
    BuildingOrganizationLink,
    LinkFunction,
    Organization,
    OrganizationMembership,
    OrganizationType,
    Role,
)
from apps.risks.models import RiskAssessment
from apps.service_requests.models import (
    Poll,
    PollOption,
    PollVote,
    RequestCategory,
    RequestStatus,
    ServiceRequest,
    ServiceRequestEvent,
)
from apps.workorders.models import Priority, WorkOrder, WorkOrderEvent, WorkOrderStatus

PASSWORD = "tirek-demo-2026"  # noqa: S105 — local demo data only, guarded by DEBUG

USERS = [
    (
        "admin@provider.local",
        "Айгерим Сапарова",
        "Руководитель технической службы",
        Role.PROVIDER_ADMIN,
    ),
    ("field@provider.local", "Данияр Ахметов", "Инженер-обследователь", Role.FIELD_SPECIALIST),
    (
        "engineer@provider.local",
        "Ерлан Касымов",
        "Ведущий инженер-конструктор",
        Role.REVIEWING_ENGINEER,
    ),
    ("pto@provider.local", "Марат Жумабаев", "Начальник ПТО", Role.PRODUCTION_PLANNER),
    ("dispatcher@provider.local", "Гульнара Омарова", "Диспетчер", Role.DISPATCHER),
]

ITEMS = [
    ("roof", "КР-01", "Состояние кровельного покрытия", AnswerType.COMPLIANCE, ""),
    ("roof", "КР-02", "Площадь участков с протечками", AnswerType.NUMBER, "м²"),
    ("roof", "КР-03", "Состояние водосточной системы", AnswerType.COMPLIANCE, ""),
    ("facade", "ФС-01", "Трещины в наружных стенах и межпанельных швах", AnswerType.COMPLIANCE, ""),
    ("facade", "ФС-02", "Состояние балконных плит и ограждений", AnswerType.COMPLIANCE, ""),
    ("basement", "ПД-01", "Подтопление и следы замачивания подвала", AnswerType.COMPLIANCE, ""),
    ("basement", "ПД-02", "Состояние отмостки", AnswerType.COMPLIANCE, ""),
    ("heating", "ОТ-01", "Состояние изоляции и коррозия трубопроводов", AnswerType.COMPLIANCE, ""),
    ("water", "ВС-01", "Протечки в узлах водоснабжения", AnswerType.COMPLIANCE, ""),
    ("electrical", "ЭЛ-01", "Состояние ВРУ и этажных щитов", AnswerType.TEXT, ""),
]

BUILDINGS = [
    # code, address, year, floors, entrances, apartments, area, scheme
    ("ALM-0001", "пр. Достык, 12", 1984, 9, 4, 144, "8 412.60", StructuralScheme.PANEL),
    ("ALM-0002", "ул. Абая, 48", 1971, 5, 3, 60, None, StructuralScheme.BRICK),
    ("ALM-0003", "мкр. Самал-2, д. 33", None, 12, 2, 96, "6 230.00", StructuralScheme.MONOLITHIC),
]


def days_ago(n: int) -> date:
    return timezone.localdate() - timedelta(days=n)


def at(n: int):
    return timezone.now() - timedelta(days=n)


class Command(BaseCommand):
    help = "Create demo organizations, users, buildings and a realistic workflow slice."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo is only allowed with DEBUG=true")

        provider, _ = Organization.objects.get_or_create(
            name="Инженерный центр «Тирек» (демо)", defaults={"type": OrganizationType.PROVIDER}
        )
        other, _ = Organization.objects.get_or_create(
            name="Другой поставщик (демо)", defaults={"type": OrganizationType.PROVIDER}
        )
        osi, _ = Organization.objects.get_or_create(
            name="ОСИ «Достык 12» (демо)", defaults={"type": OrganizationType.CUSTOMER}
        )

        self.users = {}
        for email, name, position, role in USERS:
            self.users[role] = self._user(email, name, position, provider, role)
        self.osi_user = self._user(
            "osi@customer.local",
            "Сауле Нурланова",
            "Председатель ОСИ",
            osi,
            Role.OSI_REPRESENTATIVE,
        )
        self._user("admin@other.local", "Админ другого поставщика", "", other, Role.PROVIDER_ADMIN)
        self.resident = self._user(
            "resident@customer.local", "Асель Бекова", "Житель, кв. 34", osi, Role.RESIDENT
        )
        self.neighbour = self._user(
            "resident2@customer.local", "Нурлан Сериков", "Житель, кв. 112", osi, Role.RESIDENT
        )

        self.version = self._checklist(provider)

        if Building.objects.filter(internal_code="ALM-0001").exists():
            self.stdout.write("Demo buildings already exist — skipping workflow data.")
        else:
            b1, b2, b3 = (self._building(row, provider) for row in BUILDINGS)
            BuildingOrganizationLink.objects.create(
                building=b1, organization=osi, function=LinkFunction.CUSTOMER
            )
            foreign = Building.objects.create(
                internal_code="ALM-0101",
                name="ДЕМО · объект другого поставщика",
                address="ул. Толе би, 101",
                floors=5,
                entrances=2,
            )
            BuildingOrganizationLink.objects.create(
                building=foreign, organization=other, function=LinkFunction.TECHNICAL_SUPPORT
            )
            self._approved_inspection(b1, provider)
            self._submitted_inspection(b2, provider)
            self._scheduled_inspection(b3, provider)

        self._fill_passports()
        self._classify_defects()

        if not ServiceRequest.objects.exists():
            self._requests_and_polls(Building.objects.get(internal_code="ALM-0001"))

        self.stdout.write(
            self.style.SUCCESS(f"Demo data ready. Password for all users: {PASSWORD}")
        )

    # --- organizations / users -------------------------------------------------------------

    def _user(self, email, name, position, org, role):
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(
                email=email, password=PASSWORD, full_name=name, position=position
            )
        OrganizationMembership.objects.get_or_create(user=user, organization=org, role=role)
        return user

    def _checklist(self, provider):
        template, _ = ChecklistTemplate.objects.get_or_create(
            organization=provider, name="Регулярный визуальный осмотр МКД"
        )
        version = template.versions.filter(status=ChecklistTemplateVersion.Status.PUBLISHED).first()
        if version:
            return version
        version = ChecklistTemplateVersion.objects.create(
            template=template, number=1, approved_by_note="ДЕМО · не утверждённая методика"
        )
        for i, (etype, code, text, atype, unit) in enumerate(ITEMS):
            ChecklistItem.objects.create(
                version=version,
                element_type_id=etype,
                code=code,
                text=text,
                answer_type=atype,
                unit=unit,
                sort_order=i,
                photo_required_on_fail=False,
            )
        version.status = ChecklistTemplateVersion.Status.PUBLISHED
        version.published_at = timezone.now()
        version.save()
        return version

    # --- buildings ------------------------------------------------------------------------

    def _building(self, row, provider):
        code, address, year, floors, entrances, apartments, area, scheme = row
        b = Building.objects.create(
            internal_code=code,
            name="ДЕМО · многоквартирный жилой дом",
            address=address,
            year_built=year,
            floors=floors,
            entrances=entrances,
            apartments=apartments,
            total_area_m2=area.replace(" ", "") if area else None,
            structural_scheme=scheme,
            field_sources={
                "floors": {
                    "source": "ДЕМО · технический паспорт",
                    "recorded_at": at(90).isoformat(),
                    "by": "",
                },
            },
            created_by=self.users[Role.PROVIDER_ADMIN],
        )
        BuildingOrganizationLink.objects.create(
            building=b, organization=provider, function=LinkFunction.TECHNICAL_SUPPORT
        )
        BuildingAssignment.objects.create(building=b, user=self.users[Role.FIELD_SPECIALIST])

        b.el = {}
        for n in range(1, entrances + 1):
            entrance = BuildingElement.objects.create(
                building=b, element_type_id="entrance", name=f"Подъезд №{n}"
            )
            for etype, label in (("roof", "Кровля"), ("facade", "Фасад"), ("basement", "Подвал")):
                b.el[(etype, n)] = BuildingElement.objects.create(
                    building=b,
                    parent=entrance,
                    element_type_id=etype,
                    name=f"{label} · подъезд №{n}",
                )
        for etype, label in (
            ("heating", "Система отопления"),
            ("water", "Водоснабжение"),
            ("electrical", "Электроснабжение (ВРУ)"),
            ("elevators", "Лифтовое оборудование"),
        ):
            b.el[(etype, 0)] = BuildingElement.objects.create(
                building=b, element_type_id=etype, name=label
            )
        return b

    # --- inspections ----------------------------------------------------------------------

    def _inspection(self, building, provider, number, status, **extra):
        return Inspection.objects.create(
            building=building,
            provider_organization=provider,
            template_version=self.version,
            number=number,
            assignee=self.users[Role.FIELD_SPECIALIST],
            status=status,
            scope_and_limitations=(
                "Визуальный осмотр доступных конструкций с земли, кровли и из подвала. "
                "Квартиры и закрытые технические помещения не обследовались."
            ),
            created_by=self.users[Role.REVIEWING_ENGINEER],
            **extra,
        )

    def _answers(self, inspection, failing: set[str]):
        for item in self.version.items.all():
            if item.answer_type == AnswerType.COMPLIANCE:
                value = ComplianceValue.FAIL if item.code in failing else ComplianceValue.OK
                InspectionAnswer.objects.create(
                    inspection=inspection,
                    item=item,
                    compliance=value,
                    answered_by=inspection.assignee,
                )
            elif item.answer_type == AnswerType.NUMBER:
                InspectionAnswer.objects.create(
                    inspection=inspection,
                    item=item,
                    number_value="6.5",
                    answered_by=inspection.assignee,
                )
            else:
                InspectionAnswer.objects.create(
                    inspection=inspection,
                    item=item,
                    text_value="Щиты в удовлетворительном состоянии, маркировка частично утрачена.",
                    answered_by=inspection.assignee,
                )

    def _approved_inspection(self, b, provider):
        engineer = self.users[Role.REVIEWING_ENGINEER]
        insp = self._inspection(
            b,
            provider,
            "INS-2026-0001",
            InspectionStatus.APPROVED,
            planned_date=days_ago(70),
            performed_at=at(68),
            submitted_at=at(66),
            approved_at=at(60),
            approved_by=engineer,
            reviewer=engineer,
            published_at=at(59),
            published_by=engineer,
            summary="Выявлены дефекты кровли, фасада и системы отопления. Требуется плановый ремонт.",
        )
        self._answers(insp, {"КР-01", "ФС-01", "ФС-02", "ПД-01", "ПД-02", "ОТ-01"})
        InspectionReview.objects.create(
            inspection=insp,
            reviewer=engineer,
            decision=InspectionReview.Decision.APPROVED,
            comment="Данные полные, категории риска подтверждены.",
        )

        specs = [
            # element, type, description, location, preliminary, risk, status, detected, wo
            (
                ("heating", 0),
                "Коррозия трубопровода отопления",
                "Сквозная коррозия участка подающего трубопровода, следы подтёков на изоляции.",
                "Подвал, узел ввода, ось 3–4",
                "R2",
                "R1",
                DefectStatus.FIXING,
                68,
                (
                    "Замена участка трубопровода Ду 50",
                    Priority.URGENT,
                    WorkOrderStatus.IN_PROGRESS,
                    -12,
                ),
            ),
            (
                ("roof", 2),
                "Протечка кровли",
                "Следы протечки на потолке лестничной клетки 9 этажа, вздутие рулонного покрытия.",
                "Над кв. 34–36",
                "R2",
                "R2",
                DefectStatus.PLANNED,
                68,
                ("Локальный ремонт рулонной кровли", Priority.HIGH, WorkOrderStatus.SCHEDULED, 21),
            ),
            (
                ("basement", 1),
                "Подтопление подвала",
                "Стоячая вода в приямке, следы замачивания нижней части стен.",
                "Технический подвал, секция 1",
                "R3",
                "R2",
                DefectStatus.FIX_REVIEW,
                67,
                ("Ремонт дренажного приямка и откачка", Priority.HIGH, WorkOrderStatus.DONE, -5),
            ),
            (
                ("facade", 3),
                "Раскрытие межпанельного шва",
                "Раскрытие вертикального шва до 5 мм на высоту 3 этажей, следы промерзания.",
                "Ось Б, 4–6 этаж",
                "R3",
                "R3",
                DefectStatus.CONFIRMED,
                66,
                ("Герметизация межпанельных швов", Priority.NORMAL, WorkOrderStatus.PROPOSED, None),
            ),
            (
                ("facade", 4),
                "Отслоение защитного слоя балконной плиты",
                "Оголение арматуры на торце балконной плиты, отслоение бетона.",
                "Балкон кв. 112",
                "R2",
                "R3",
                DefectStatus.CONFIRMED,
                66,
                None,
            ),
            (
                ("basement", 2),
                "Разрушение отмостки",
                "Трещины и просадка отмостки на участке 6 м, зазор у цоколя.",
                "Дворовый фасад, у подъезда №2",
                "R4",
                "R4",
                DefectStatus.CLOSED,
                120,
                ("Восстановление отмостки", Priority.LOW, WorkOrderStatus.CLOSED, -40),
            ),
        ]
        for i, spec in enumerate(specs, start=1):
            self._defect(b, insp, i, *spec)

    def _defect(
        self, b, insp, i, el_key, dtype, desc, location, prelim, risk, status, detected, wo
    ):
        field = self.users[Role.FIELD_SPECIALIST]
        engineer = self.users[Role.REVIEWING_ENGINEER]
        d = Defect.objects.create(
            number=f"DEF-2026-{i:04d}",
            building=b,
            element=b.el[el_key],
            location=location,
            inspection=insp,
            defect_type=dtype,
            description=desc,
            detected_on=days_ago(detected),
            preliminary_severity=prelim,
            status=status,
            created_by=field,
            recommendations="",
        )
        ra = RiskAssessment.objects.create(
            defect=d,
            category=risk,
            engineer=engineer,
            hazard_description=f"{dtype}: возможное развитие повреждения при отсутствии ремонта.",
            justification="Экспертная оценка по результатам визуального осмотра и фотофиксации.",
            recommended_actions="Выполнить ремонт в рекомендованный срок, после ремонта — контрольный осмотр.",
        )
        d.current_risk = ra
        d.recommendations = ra.recommended_actions
        if status == DefectStatus.CLOSED:
            d.closed_at = at(30)
            d.closed_by = engineer
            d.closure_basis = "ДЕМО · устранение проверено на месте"
        d.save()

        path = [DefectStatus.DETECTED, DefectStatus.IN_REVIEW, DefectStatus.CONFIRMED]
        tail = {
            DefectStatus.PLANNED: [DefectStatus.PLANNED],
            DefectStatus.FIXING: [DefectStatus.PLANNED, DefectStatus.FIXING],
            DefectStatus.FIX_REVIEW: [
                DefectStatus.PLANNED,
                DefectStatus.FIXING,
                DefectStatus.FIX_REVIEW,
            ],
            DefectStatus.CLOSED: [
                DefectStatus.PLANNED,
                DefectStatus.FIXING,
                DefectStatus.FIX_REVIEW,
                DefectStatus.CLOSED,
            ],
        }.get(status, [])
        prev = ""
        for step, st in enumerate(path[1:] + tail):
            ev = DefectEvent.objects.create(
                defect=d,
                from_status=prev or DefectStatus.DETECTED,
                to_status=st,
                actor=engineer if st != DefectStatus.IN_REVIEW else field,
            )
            DefectEvent.objects.filter(pk=ev.pk).update(
                created_at=at(max(detected - 2 - step * 6, 1))
            )
            prev = st
        Defect.objects.filter(pk=d.pk).update(created_at=at(detected))

        if i == 2:  # repeated observations show the defect getting worse (AC-17)
            for n, (text, trend) in enumerate(
                [
                    ("Пятно протечки около 0,5 м²", "same"),
                    ("Площадь пятна выросла до 1,2 м²", "worse"),
                ]
            ):
                DefectObservation.objects.create(
                    defect=d,
                    observed_on=days_ago(68 - n * 30),
                    description=text,
                    trend=trend,
                    observer=field,
                )

        if wo:
            self._work_order(b, d, i, *wo)

    def _work_order(self, b, defect, i, title, priority, status, planned_offset):
        engineer = self.users[Role.REVIEWING_ENGINEER]
        today = timezone.localdate()
        wo = WorkOrder.objects.create(
            number=f"WO-2026-{i:04d}",
            building=b,
            defect=defect,
            element=defect.element,
            title=title,
            priority=priority,
            status=status,
            recommended_date=today + timedelta(days=(planned_offset or 30) - 7),
            planned_date=(today + timedelta(days=planned_offset))
            if planned_offset is not None
            else None,
            responsible_name="ДЕМО · подрядная организация",
            created_by=engineer,
        )
        chain = [
            WorkOrderStatus.AGREED,
            WorkOrderStatus.SCHEDULED,
            WorkOrderStatus.IN_PROGRESS,
            WorkOrderStatus.DONE,
            WorkOrderStatus.VERIFIED,
            WorkOrderStatus.CLOSED,
        ]
        steps = chain[: chain.index(status) + 1] if status in chain else []
        prev = WorkOrderStatus.PROPOSED
        for n, st in enumerate(steps):
            actor = self.osi_user if st == WorkOrderStatus.AGREED else engineer
            ev = WorkOrderEvent.objects.create(
                work_order=wo,
                from_status=prev,
                to_status=st,
                actor=actor,
                actor_role="osi_representative" if actor == self.osi_user else "reviewing_engineer",
            )
            WorkOrderEvent.objects.filter(pk=ev.pk).update(created_at=at(55 - n * 8))
            prev = st
        WorkOrder.objects.filter(pk=wo.pk).update(created_at=at(58))

    def _submitted_inspection(self, b, provider):
        insp = self._inspection(
            b,
            provider,
            "INS-2026-0002",
            InspectionStatus.SUBMITTED,
            planned_date=days_ago(6),
            performed_at=at(5),
            submitted_at=at(3),
        )
        self._answers(insp, {"КР-03", "ВС-01"})
        field = self.users[Role.FIELD_SPECIALIST]
        for n, (key, dtype, desc, prelim) in enumerate(
            [
                (
                    ("roof", 1),
                    "Разрушение водосточной воронки",
                    "Воронка внутреннего водостока смещена, вода уходит под покрытие.",
                    "R3",
                ),
                (
                    ("water", 0),
                    "Течь запорной арматуры",
                    "Капельная течь задвижки на вводе ХВС.",
                    "R4",
                ),
            ],
            start=7,
        ):
            Defect.objects.create(
                number=f"DEF-2026-{n:04d}",
                building=b,
                element=b.el[key],
                inspection=insp,
                defect_type=dtype,
                description=desc,
                detected_on=days_ago(5),
                preliminary_severity=prelim,
                status=DefectStatus.IN_REVIEW,
                created_by=field,
            )

    def _scheduled_inspection(self, b, provider):
        self._inspection(
            b, provider, "INS-2026-0003", InspectionStatus.DRAFT, planned_date=days_ago(-9)
        )

    # --- resident requests and polls ------------------------------------------------------

    def _requests_and_polls(self, b):
        dispatcher = self.users[Role.DISPATCHER]
        field = self.users[Role.FIELD_SPECIALIST]
        specs = [
            # author, category, entrance, floor, apt, place, description, emergency, status, days, assignee, resolution
            (
                self.resident,
                RequestCategory.LEAK,
                2,
                9,
                "34",
                "потолок в коридоре",
                "После дождя капает с потолка в коридоре, на обоях мокрое пятно примерно метр.",
                False,
                RequestStatus.IN_PROGRESS,
                3,
                field,
                "",
            ),
            (
                self.resident,
                RequestCategory.ELEVATOR,
                2,
                None,
                "",
                "лифт подъезда №2",
                "Лифт останавливается между 5 и 6 этажом, двери открываются не до конца.",
                False,
                RequestStatus.RESOLVED,
                21,
                field,
                "Заменён датчик точной остановки, лифт проверен.",
            ),
            (
                self.neighbour,
                RequestCategory.ELECTRICAL,
                4,
                1,
                "",
                "этажный щит, 1 этаж",
                "Из этажного щита пахнет гарью, слышно потрескивание.",
                True,
                RequestStatus.NEW,
                0,
                None,
                "",
            ),
            (
                self.neighbour,
                RequestCategory.COMMON_AREAS,
                4,
                None,
                "",
                "входная дверь",
                "Не закрывается входная дверь подъезда, сломан доводчик.",
                False,
                RequestStatus.ACCEPTED,
                1,
                None,
                "",
            ),
            (
                self.resident,
                RequestCategory.OTHER,
                2,
                None,
                "",
                "двор",
                "Прошу покрасить скамейки во дворе.",
                False,
                RequestStatus.REJECTED,
                30,
                None,
                "Благоустройство двора не входит в техническое обслуживание; передано в ОСИ.",
            ),
        ]
        for i, (
            author,
            cat,
            ent,
            floor,
            apt,
            place,
            desc,
            emerg,
            status,
            days,
            assignee,
            res,
        ) in enumerate(specs, start=1):
            req = ServiceRequest.objects.create(
                number=f"REQ-2026-{i:04d}",
                building=b,
                author=author,
                category=cat,
                entrance=ent,
                floor=floor,
                apartment=apt,
                place=place,
                description=desc,
                is_emergency=emerg,
                status=status,
                assignee=assignee,
                due_date=(
                    days_ago(-2) if assignee and status == RequestStatus.IN_PROGRESS else None
                ),
                resolution=res,
                created_by=author,
            )
            ServiceRequest.objects.filter(pk=req.pk).update(created_at=at(days))
            path = {
                RequestStatus.ACCEPTED: [RequestStatus.ACCEPTED],
                RequestStatus.IN_PROGRESS: [RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS],
                RequestStatus.RESOLVED: [
                    RequestStatus.ACCEPTED,
                    RequestStatus.IN_PROGRESS,
                    RequestStatus.RESOLVED,
                ],
                RequestStatus.REJECTED: [RequestStatus.REJECTED],
            }.get(status, [])
            prev = RequestStatus.NEW
            for n, st in enumerate(path):
                ev = ServiceRequestEvent.objects.create(
                    request=req,
                    from_status=prev,
                    to_status=st,
                    actor=dispatcher,
                    comment=res
                    if st in (RequestStatus.RESOLVED, RequestStatus.REJECTED)
                    else (f"Исполнитель: {assignee}" if st == RequestStatus.IN_PROGRESS else ""),
                )
                ServiceRequestEvent.objects.filter(pk=ev.pk).update(
                    created_at=at(max(days - n - 1, 0))
                )
                prev = st
            if author and path:
                Notification.objects.create(
                    recipient=author,
                    kind=NotificationKind.SERVICE_REQUEST,
                    building=b,
                    title=f"Заявка {req.number}: {RequestStatus(status).label.lower()}",
                    body=res,
                    link=f"/resident/requests/{req.pk}",
                )
        Notification.objects.create(
            recipient=dispatcher,
            kind=NotificationKind.EMERGENCY_REQUEST,
            building=b,
            title="Новая заявка с отметкой «авария»: REQ-2026-0003",
            body="Запах гари из этажного щита, подъезд №4.",
            link="/requests",
        )

        poll = Poll.objects.create(
            building=b,
            created_by=self.osi_user,
            question="Когда удобнее провести замену стояков отопления в подъезде №2?",
            description="Консультативный опрос ОСИ. Не является юридически значимым голосованием собственников.",
            closes_at=at(-14),
        )
        options = [
            PollOption.objects.create(poll=poll, text=t, sort_order=i)
            for i, t in enumerate(
                [
                    "В мае, сразу после отопительного сезона",
                    "В июне",
                    "В августе, перед отопительным сезоном",
                ]
            )
        ]
        PollVote.objects.create(poll=poll, option=options[1], user=self.neighbour)
        poll2 = Poll.objects.create(
            building=b,
            created_by=self.osi_user,
            question="Устанавливать ли видеонаблюдение у входов в подъезды?",
            description="Консультативный опрос ОСИ.",
            closes_at=at(-30),
        )
        for i, t in enumerate(["Да", "Нет", "Нужна дополнительная информация"]):
            PollOption.objects.create(poll=poll2, text=t, sort_order=i)

    # --- digital passport -----------------------------------------------------------------

    PASSPORTS = {
        "ALM-0001": {
            "foundation": ("present", None, "Ленточный сборный железобетонный"),
            "walls": ("present", None, "Трёхслойные железобетонные панели, 350 мм"),
            "columns": ("absent", None, "Бескаркасная панельная схема"),
            "beams": ("absent", None, "Бескаркасная панельная схема"),
            "slabs": ("present", None, "Сборные ж/б многопустотные плиты"),
            "balconies": ("present", 128, "Консольные ж/б плиты с металлическим ограждением"),
            "facade": (
                "present",
                None,
                "Панели с декоративным слоем, межпанельные швы герметизированы в 2009 г.",
            ),
            "roof": (
                "present",
                None,
                "Плоская совмещённая, рулонное покрытие, внутренний водосток",
            ),
            "electrical": ("present", None, "ВРУ 0,4 кВ, один ввод, этажные щиты"),
            "water": ("present", None, "ХВС и ГВС, стальные стояки"),
            "sewerage": ("present", None, "Чугунные стояки, выпуски в дворовую сеть"),
            "heating": ("present", None, "Центральное, однотрубная система, верхний розлив"),
            "heat_point": ("present", 1, "ИТП в подвале, подъезд №1"),
            "ventilation": ("present", None, "Естественная вытяжная через кухни и санузлы"),
            "gas": ("present", None, "Газовые плиты в квартирах"),
            "fire_safety": ("unknown", None, ""),
            "low_current": ("present", None, "Домофон, кабельное ТВ, интернет"),
            "elevators": ("present", 4, "Пассажирские, 400 кг, по одному в подъезде"),
            "basement": ("present", None, "Технический подвал под всем домом"),
            "attic": ("absent", None, "Совмещённая кровля без чердака"),
            "parking": ("absent", None, ""),
            "territory": ("present", None, "Двор, детская площадка, гостевые парковочные места"),
        },
        "ALM-0002": {
            "foundation": ("present", None, "Ленточный бутовый"),
            "walls": ("present", None, "Кирпич, 510 мм"),
            "slabs": ("present", None, "Деревянные балки по этажам, ж/б над подвалом"),
            "roof": ("present", None, "Скатная, шифер, наружный водосток"),
            "heating": ("present", None, "Центральное"),
            "gas": ("present", None, "Газовые плиты"),
            "elevators": ("absent", None, "Пятиэтажный дом без лифта"),
            "attic": ("present", None, "Холодный чердак"),
            "basement": ("present", None, "Подвал под частью дома"),
        },
        "ALM-0003": {
            "walls": ("present", None, "Монолитный ж/б каркас с заполнением газоблоком"),
            "elevators": ("present", 4, "По два лифта в подъезде"),
            "parking": ("present", None, "Подземный паркинг"),
        },
    }

    def _fill_passports(self):
        engineer = self.users[Role.REVIEWING_ENGINEER]
        for code, data in self.PASSPORTS.items():
            b = Building.objects.filter(internal_code=code).first()
            if b is None:
                continue
            ensure_passport(b)
            entries = b.passport_entries.all()
            if entries.exclude(presence=Presence.UNKNOWN).exists():
                continue  # already described, keep whatever is there
            for entry in entries:
                presence, qty, text = data.get(entry.element_type_id, ("unknown", None, ""))
                if presence == "unknown":
                    continue
                entry.presence = presence
                entry.quantity = qty
                entry.characteristics = text
                entry.source = "ДЕМО · технический паспорт и осмотр"
                entry.updated_by = engineer
                entry.save()

    def _classify_defects(self):
        """Demo defects get a category and, if assessed, a priority (only where empty)."""
        from apps.defects.models import PRIORITY_BY_RISK
        from apps.defects.services import guess_category

        for d in Defect.objects.filter(number__startswith="DEF-2026-").select_related(
            "current_risk"
        ):
            changed = []
            if d.category_id is None:
                d.category_id = guess_category(d.defect_type) or "other"
                changed.append("category")
            if not d.priority and d.current_risk_id:
                d.priority = PRIORITY_BY_RISK[d.current_risk.category]
                changed.append("priority")
            if changed:
                d.save(update_fields=changed)
