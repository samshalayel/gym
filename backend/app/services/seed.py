from sqlalchemy.orm import Session
from app.models.__all_models import *
from app.auth.auth import get_password_hash
from datetime import date, timedelta, time


def seed_data(db: Session):
    if db.query(User).count() > 0:
        return

    admin = User(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        email="admin@gym.com",
        role="admin",
    )
    db.add(admin)

    staff_list = [
        Staff(
            name="أحمد السيد",
            phone="555-0101",
            email="ahmed@gym.com",
            role="trainer",
            specialization="تدريب القوة",
        ),
        Staff(
            name="سارة محمد",
            phone="555-0102",
            email="sarah@gym.com",
            role="trainer",
            specialization="يوغا ومرونة",
        ),
        Staff(
            name="ماهر عبدالله",
            phone="555-0103",
            email="maher@gym.com",
            role="trainer",
            specialization="تمارين القلب",
        ),
    ]
    db.add_all(staff_list)

    plans = [
        MembershipPlan(
            name="الباقة الشهرية الأساسية",
            duration_months=1,
            price=49.99,
            description="وصول إلى معدات الجيم والمرافق الأساسية",
        ),
        MembershipPlan(
            name="الباقة الشهرية الممتازة",
            duration_months=1,
            price=79.99,
            description="وصول كامل يشمل الحصص والساونا",
        ),
        MembershipPlan(
            name="الباقة الربع سنوية الأساسية",
            duration_months=3,
            price=129.99,
            description="3 أشهر - وصول إلى معدات الجيم",
        ),
        MembershipPlan(
            name="الباقة الربع سنوية الممتازة",
            duration_months=3,
            price=199.99,
            description="3 أشهر - وصول كامل",
        ),
        MembershipPlan(
            name="الباقة السنوية الأساسية",
            duration_months=12,
            price=399.99,
            description="أفضل قيمة - وصول إلى معدات الجيم",
        ),
        MembershipPlan(
            name="الباقة السنوية الممتازة",
            duration_months=12,
            price=699.99,
            description="أفضل قيمة - وصول كامل مع مدرب شخصي",
        ),
    ]
    db.add_all(plans)

    offers = [
        Offer(
            name="تخفيضات الصيف",
            description="خصم 20% على جميع الباقات",
            discount_percent=20,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=60),
            is_active="true",
        ),
        Offer(
            name="عرض رأس السنة",
            description="₪50 خصم على الباقات السنوية",
            discount_fixed=50,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            is_active="true",
        ),
        Offer(
            name="خصم الإحالة",
            description="خصم 15% عند إحالة صديق",
            discount_percent=15,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            is_active="true",
        ),
    ]
    db.add_all(offers)

    members = [
        Member(
            name="أحمد علي",
            phone="555-1001",
            email="ahmed@email.com",
            gender="male",
            age=28,
            address="شارع الملك فهد، الرياض",
            emergency_contact="محمد علي",
            emergency_phone="555-9001",
            status="active",
        ),
        Member(
            name="نورة خالد",
            phone="555-1002",
            email="noura@email.com",
            gender="female",
            age=35,
            address="شارع العليا، الرياض",
            emergency_contact="خالد السالم",
            emergency_phone="555-9002",
            status="active",
        ),
        Member(
            name="سامي عمر",
            phone="555-1003",
            email="sami@email.com",
            gender="male",
            age=42,
            address="شارع الأمير سلطان، جدة",
            emergency_contact="عمر سامي",
            emergency_phone="555-9003",
            status="active",
        ),
        Member(
            name="ليلى حسن",
            phone="555-1004",
            email="layla@email.com",
            gender="female",
            age=55,
            address="شارع التحلية، جدة",
            emergency_contact="حسن علي",
            emergency_phone="555-9004",
            status="expired",
        ),
        Member(
            name="فهد عبدالله",
            phone="555-1005",
            email="fahad@email.com",
            gender="male",
            age=24,
            address="شارع الظهران، الخبر",
            emergency_contact="عبدالله فهد",
            emergency_phone="555-9005",
            status="active",
        ),
        Member(
            name="مريم سعد",
            phone="555-1006",
            email="maryam@email.com",
            gender="female",
            age=31,
            address="شارع السلام، الدمام",
            emergency_contact="سعد مريم",
            emergency_phone="555-9006",
            status="frozen",
        ),
        Member(
            name="خالد إبراهيم",
            phone="555-1007",
            email="khalid@email.com",
            gender="male",
            age=38,
            address="شارع النخيل، الرياض",
            emergency_contact="إبراهيم خالد",
            emergency_phone="555-9007",
            status="active",
        ),
        Member(
            name="هدى عبدالرحمن",
            phone="555-1008",
            email="huda@email.com",
            gender="female",
            age=45,
            address="شارع الأندلس، مكة",
            emergency_contact="عبدالرحمن هدى",
            emergency_phone="555-9008",
            status="canceled",
        ),
    ]
    db.add_all(members)
    db.flush()

    member_users = [
        User(
            username="ahmed",
            hashed_password=get_password_hash("ahmed123"),
            email="ahmed@email.com",
            role="member",
            member_id=1,
        ),
        User(
            username="noura",
            hashed_password=get_password_hash("noura123"),
            email="noura@email.com",
            role="member",
            member_id=2,
        ),
        User(
            username="sami",
            hashed_password=get_password_hash("sami123"),
            email="sami@email.com",
            role="member",
            member_id=3,
        ),
        User(
            username="layla",
            hashed_password=get_password_hash("layla123"),
            email="layla@email.com",
            role="member",
            member_id=4,
        ),
        User(
            username="fahad",
            hashed_password=get_password_hash("fahad123"),
            email="fahad@email.com",
            role="member",
            member_id=5,
        ),
        User(
            username="maryam",
            hashed_password=get_password_hash("maryam123"),
            email="maryam@email.com",
            role="member",
            member_id=6,
        ),
        User(
            username="khalid",
            hashed_password=get_password_hash("khalid123"),
            email="khalid@email.com",
            role="member",
            member_id=7,
        ),
        User(
            username="huda",
            hashed_password=get_password_hash("huda123"),
            email="huda@email.com",
            role="member",
            member_id=8,
        ),
    ]
    db.add_all(member_users)

    subscriptions = [
        Subscription(
            member_id=1,
            plan_id=2,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=335),
            amount_paid=699.99,
            payment_status="paid",
            renewal_status="active",
        ),
        Subscription(
            member_id=2,
            plan_id=1,
            start_date=date.today() - timedelta(days=15),
            end_date=date.today() + timedelta(days=15),
            amount_paid=49.99,
            payment_status="paid",
            renewal_status="active",
        ),
        Subscription(
            member_id=3,
            plan_id=4,
            start_date=date.today() - timedelta(days=60),
            end_date=date.today() + timedelta(days=30),
            amount_paid=199.99,
            payment_status="paid",
            renewal_status="active",
        ),
        Subscription(
            member_id=4,
            plan_id=5,
            start_date=date.today() - timedelta(days=400),
            end_date=date.today() - timedelta(days=35),
            amount_paid=399.99,
            payment_status="paid",
            renewal_status="expired",
        ),
        Subscription(
            member_id=5,
            plan_id=2,
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() + timedelta(days=355),
            amount_paid=699.99,
            payment_status="paid",
            renewal_status="active",
        ),
        Subscription(
            member_id=6,
            plan_id=3,
            start_date=date.today() - timedelta(days=90),
            end_date=date.today() - timedelta(days=1),
            amount_paid=129.99,
            payment_status="paid",
            renewal_status="expired",
        ),
        Subscription(
            member_id=7,
            plan_id=1,
            start_date=date.today() - timedelta(days=5),
            end_date=date.today() + timedelta(days=25),
            amount_paid=49.99,
            payment_status="unpaid",
            renewal_status="pending",
        ),
    ]
    db.add_all(subscriptions)

    equipment = [
        Equipment(
            name="جهاز المشي Pro",
            category="cardio",
            quantity=10,
            condition="good",
            maintenance_status="ok",
            last_maintenance=date.today() - timedelta(days=30),
            next_maintenance=date.today() + timedelta(days=60),
            location="قاعة القلب",
        ),
        Equipment(
            name="جهاز الإليبتيكال",
            category="cardio",
            quantity=8,
            condition="good",
            maintenance_status="ok",
            last_maintenance=date.today() - timedelta(days=45),
            next_maintenance=date.today() + timedelta(days=45),
            location="قاعة القلب",
        ),
        Equipment(
            name="بنش برس",
            category="strength",
            quantity=6,
            condition="good",
            maintenance_status="ok",
            last_maintenance=date.today() - timedelta(days=20),
            next_maintenance=date.today() + timedelta(days=70),
            location="قاعة الأوزان",
        ),
        Equipment(
            name="سكوات رف",
            category="strength",
            quantity=4,
            condition="fair",
            maintenance_status="needs_service",
            last_maintenance=date.today() - timedelta(days=90),
            next_maintenance=date.today() - timedelta(days=1),
            location="قاعة الأوزان",
        ),
        Equipment(
            name="طقم دمبل",
            category="strength",
            quantity=15,
            condition="good",
            maintenance_status="ok",
            last_maintenance=date.today() - timedelta(days=60),
            next_maintenance=date.today() + timedelta(days=90),
            location="قاعة الأوزان",
        ),
        Equipment(
            name="حصير يوغا",
            category="flexibility",
            quantity=30,
            condition="new",
            maintenance_status="ok",
            last_maintenance=date.today() - timedelta(days=10),
            next_maintenance=date.today() + timedelta(days=180),
            location="قاعة الاستوديو",
        ),
        Equipment(
            name="دراجة ثابتة",
            category="cardio",
            quantity=8,
            condition="fair",
            maintenance_status="needs_service",
            last_maintenance=date.today() - timedelta(days=120),
            next_maintenance=date.today() - timedelta(days=30),
            location="قاعة القلب",
        ),
        Equipment(
            name="جهاز السحب",
            category="strength",
            quantity=3,
            condition="good",
            maintenance_status="ok",
            last_maintenance=date.today() - timedelta(days=40),
            next_maintenance=date.today() + timedelta(days=50),
            location="قاعة الأوزان",
        ),
    ]
    db.add_all(equipment)

    appointments = [
        Appointment(
            member_id=1,
            trainer_id=1,
            date=date.today(),
            time=time(9, 0),
            duration=60,
            type="personal_training",
            status="scheduled",
        ),
        Appointment(
            member_id=2,
            trainer_id=2,
            date=date.today(),
            time=time(10, 0),
            duration=45,
            type="consultation",
            status="scheduled",
        ),
        Appointment(
            member_id=3,
            trainer_id=3,
            date=date.today(),
            time=time(14, 0),
            duration=60,
            type="personal_training",
            status="scheduled",
        ),
        Appointment(
            member_id=5,
            trainer_id=1,
            date=date.today() + timedelta(days=1),
            time=time(9, 0),
            duration=60,
            type="personal_training",
            status="scheduled",
        ),
        Appointment(
            member_id=7,
            trainer_id=2,
            date=date.today() + timedelta(days=2),
            time=time(11, 0),
            duration=45,
            type="group_class",
            status="scheduled",
        ),
    ]
    db.add_all(appointments)

    workout_types = [
        WorkoutType(
            name="كارديو HIIT",
            category="cardio",
            description="تمارين عالية الكثافة متقطعة",
        ),
        WorkoutType(
            name="تدريب القوة",
            category="strength",
            description="رفع الأثقال وتمارين المقاومة",
        ),
        WorkoutType(
            name="يوغا القوة",
            category="flexibility",
            description="يوغا ديناميكية للقوة والمرونة",
        ),
        WorkoutType(
            name="دائرة حرق الدهون",
            category="weight loss",
            description="تمارين دائرية لحرق الدهون",
        ),
        WorkoutType(
            name="بناء العضلات",
            category="muscle gain",
            description="زيادة الحمل التدريجي لنمو العضلات",
        ),
    ]
    db.add_all(workout_types)

    exercises = [
        Exercise(
            name="بنش برس",
            description="رفع البار من الصدر",
            target_muscles="الصدر، الكتفين، الترايسبس",
            difficulty="intermediate",
            category="strength",
        ),
        Exercise(
            name="سكوات",
            description="قرفصاء بالبار",
            target_muscles="الفخذين، الأرداف، الأساس",
            difficulty="intermediate",
            category="strength",
        ),
        Exercise(
            name="ديدلفت",
            description="رفع الأثقال من الأرض",
            target_muscles="الظهر، الأرداف، أوتار الركبة",
            difficulty="advanced",
            category="strength",
        ),
        Exercise(
            name="ضغط",
            description="تمارين الضغط بالجسم",
            target_muscles="الصدر، الكتفين، الترايسبس",
            difficulty="beginner",
            category="strength",
        ),
        Exercise(
            name="سحب",
            description="تمارين السحب بالجسم",
            target_muscles="الظهر، البايسبس",
            difficulty="intermediate",
            category="strength",
        ),
        Exercise(
            name="جري",
            description="الجري على الجهاز",
            target_muscles="الأرجل، القلب",
            difficulty="beginner",
            category="cardio",
        ),
        Exercise(
            name="بيربي",
            description="تمارين بيربي لكامل الجسم",
            target_muscles="كامل الجسم",
            difficulty="intermediate",
            category="cardio",
        ),
        Exercise(
            name="بلانك",
            description="تمارين البلانك الأساسية",
            target_muscles="الأساس، الكتفين",
            difficulty="beginner",
            category="flexibility",
        ),
        Exercise(
            name="دمبل كيرل",
            description="تمارين العضلة ذات الرأسين بالدمبل",
            target_muscles="البايسبس",
            difficulty="beginner",
            category="strength",
        ),
        Exercise(
            name="ضغط كتف",
            description="ضغط الدمبل من الكتف",
            target_muscles="الكتفين، الترايسبس",
            difficulty="intermediate",
            category="strength",
        ),
    ]
    db.add_all(exercises)

    nutrition_plans = [
        NutritionPlan(
            member_id=1,
            goal="muscle_gain",
            meals_per_day=5,
            calories=3200,
            protein_g=180,
            carbs_g=400,
            fats_g=70,
            meal_plan="وجبات عالية البروتين مع كربوهيدرات معقدة",
            notes="زيادة البروتين بعد التمرين",
        ),
        NutritionPlan(
            member_id=3,
            goal="weight_loss",
            meals_per_day=4,
            calories=1800,
            protein_g=120,
            carbs_g=180,
            fats_g=50,
            meal_plan="عجز سعري مع بروتين عالي",
            notes="تجنب الأطعمة المصنعة",
        ),
        NutritionPlan(
            member_id=5,
            goal="maintenance",
            meals_per_day=3,
            calories=2400,
            protein_g=140,
            carbs_g=280,
            fats_g=60,
            meal_plan="وجبات متوازنة مع مغذيات مناسبة",
            notes="حافظ على ترطيب الجسم",
        ),
    ]
    db.add_all(nutrition_plans)

    workout_plans = [
        WorkoutPlan(
            member_id=1,
            name="بناء العضلات المتقدم",
            exercises="بنش برس, سكوات, ديدلفت, سحب, ضغط كتف",
            days_per_week=5,
            notes="زيادة الحمل كل أسبوع",
        ),
        WorkoutPlan(
            member_id=3,
            name="دائرة حرق الدهون",
            exercises="جري, بيربي, سكوات, ضغط, بلانك",
            days_per_week=4,
            notes="التركيز على الكثافة العالية",
        ),
        WorkoutPlan(
            member_id=7,
            name="لياقة كاملة للجسم",
            exercises="سكوات, ضغط, جري, دمبل كيرل, بلانك",
            days_per_week=3,
            notes="برنامج مناسب للمبتدئين",
        ),
    ]
    db.add_all(workout_plans)

    db.commit()
