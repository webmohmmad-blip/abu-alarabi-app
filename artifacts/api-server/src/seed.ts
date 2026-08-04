import { db } from "@workspace/db";
import {
  subjectsTable,
  unitsTable,
  dossiersTable,
  worksheetsTable,
  examsTable,
  questionsTable,
  questionChoicesTable,
  achievementsTable,
} from "@workspace/db";

async function seed() {
  console.log("🌱 Seeding database...");

  // ─── SUBJECTS ───────────────────────────────────────────────
  const subjects = await db
    .insert(subjectsTable)
    .values([
      { name: "الرياضيات", grade: "12", field: "علمي", color: "#5A2D82" },
      { name: "الفيزياء", grade: "12", field: "علمي", color: "#0D9BB5" },
      { name: "الكيمياء", grade: "12", field: "علمي", color: "#C79A2D" },
      { name: "الأحياء", grade: "12", field: "علمي", color: "#2FA84F" },
      { name: "اللغة العربية", grade: "12", field: "all", color: "#8B1A1A" },
      { name: "اللغة الإنجليزية", grade: "12", field: "all", color: "#1565C0" },
      { name: "التاريخ", grade: "12", field: "أدبي", color: "#795548" },
      { name: "الجغرافيا", grade: "12", field: "أدبي", color: "#4CAF50" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`✅ Inserted ${subjects.length} subjects`);

  if (subjects.length === 0) {
    console.log("Subjects already seeded, skipping...");
    return;
  }

  const mathId = subjects[0]!.id;
  const physicsId = subjects[1]!.id;
  const chemId = subjects[2]!.id;
  const bioId = subjects[3]!.id;
  const arabicId = subjects[4]!.id;

  // ─── UNITS ──────────────────────────────────────────────────
  await db.insert(unitsTable).values([
    { subjectId: mathId, title: "الوحدة الأولى: الدوال والعلاقات", order: 1 },
    { subjectId: mathId, title: "الوحدة الثانية: حساب المثلثات", order: 2 },
    { subjectId: mathId, title: "الوحدة الثالثة: الاشتقاق", order: 3 },
    { subjectId: mathId, title: "الوحدة الرابعة: التكامل", order: 4 },
    { subjectId: physicsId, title: "الوحدة الأولى: الحركة", order: 1 },
    { subjectId: physicsId, title: "الوحدة الثانية: القوى", order: 2 },
    { subjectId: physicsId, title: "الوحدة الثالثة: الكهرباء", order: 3 },
    { subjectId: chemId, title: "الوحدة الأولى: التفاعلات الكيميائية", order: 1 },
    { subjectId: chemId, title: "الوحدة الثانية: الجدول الدوري", order: 2 },
    { subjectId: arabicId, title: "الوحدة الأولى: النصوص الأدبية", order: 1 },
    { subjectId: arabicId, title: "الوحدة الثانية: القواعد النحوية", order: 2 },
  ]);

  // ─── DOSSIERS ───────────────────────────────────────────────
  const dossiers = await db
    .insert(dossiersTable)
    .values([
      {
        title: "دوسيه الرياضيات الشامل - الصف الثاني عشر",
        description: "يغطي جميع مناهج الرياضيات للصف الثاني عشر العلمي",
        subjectId: mathId,
        grade: "12",
        pageCount: 124,
        fileSize: "8.4 MB",
        downloads: 4821,
        views: 12394,
        rating: "4.9",
        
      },
      {
        title: "دوسيه الفيزياء - الوحدات الأولى والثانية",
        description: "شرح مفصل للحركة والقوى مع تمارين محلولة",
        subjectId: physicsId,
        grade: "12",
        pageCount: 96,
        fileSize: "6.2 MB",
        downloads: 3547,
        views: 8921,
        rating: "4.8",
        
      },
      {
        title: "دوسيه الكيمياء الشامل",
        description: "مرجع متكامل لمنهج الكيمياء الثوي عشر",
        subjectId: chemId,
        grade: "12",
        pageCount: 88,
        fileSize: "5.7 MB",
        downloads: 2934,
        views: 7210,
        rating: "4.7",
        
      },
      {
        title: "دوسيه الأحياء - الوراثة والتكاثر",
        description: "شرح مفصل لوحدات الوراثة والتكاثر",
        subjectId: bioId,
        grade: "12",
        pageCount: 72,
        fileSize: "4.9 MB",
        downloads: 2156,
        views: 5840,
        rating: "4.8",
        
      },
      {
        title: "دوسيه اللغة العربية - الأدب والنصوص",
        description: "تحليل شامل للنصوص الأدبية في المنهج",
        subjectId: arabicId,
        grade: "12",
        pageCount: 108,
        fileSize: "7.1 MB",
        downloads: 5241,
        views: 14200,
        rating: "4.9",
        
      },
      {
        title: "دوسيه الرياضيات - التفاضل والتكامل",
        description: "شرح معمق لوحدة التفاضل والتكامل مع أمثلة مفصلة",
        subjectId: mathId,
        grade: "12",
        pageCount: 54,
        fileSize: "3.8 MB",
        downloads: 1893,
        views: 4780,
        rating: "4.6",
        
      },
    ])
    .returning();

  console.log(`✅ Inserted ${dossiers.length} dossiers`);

  // ─── WORKSHEETS ─────────────────────────────────────────────
  await db.insert(worksheetsTable).values([
    {
      title: "ورقة عمل - معادلات من الدرجة الثانية",
      subjectId: mathId,
      grade: "12",
      difficulty: "medium",
      questionCount: 20,
      estimatedMinutes: 45,
      downloads: 1847,
      solvers: 923,
      
    },
    {
      title: "ورقة عمل - قوانين نيوتن للحركة",
      subjectId: physicsId,
      grade: "12",
      difficulty: "hard",
      questionCount: 15,
      estimatedMinutes: 60,
      downloads: 1234,
      solvers: 567,
      
    },
    {
      title: "ورقة عمل - الجدول الدوري والروابط الكيميائية",
      subjectId: chemId,
      grade: "12",
      difficulty: "medium",
      questionCount: 25,
      estimatedMinutes: 40,
      downloads: 987,
      solvers: 412,
      
    },
    {
      title: "ورقة عمل - النحو والإملاء",
      subjectId: arabicId,
      grade: "12",
      difficulty: "easy",
      questionCount: 30,
      estimatedMinutes: 35,
      downloads: 2341,
      solvers: 1892,
      
    },
    {
      title: "ورقة عمل - التفاضل المتقدم",
      subjectId: mathId,
      grade: "12",
      difficulty: "hard",
      questionCount: 12,
      estimatedMinutes: 90,
      downloads: 743,
      solvers: 284,
      
    },
  ]);

  // ─── EXAMS ──────────────────────────────────────────────────
  const exams = await db
    .insert(examsTable)
    .values([
      {
        title: "امتحان الرياضيات الشامل",
        subjectId: mathId,
        type: "full",
        difficulty: "hard",
        durationMinutes: 120,
        instructions: "اقرأ كل سؤال بعناية قبل الإجابة. مُنع استخدام الحاسبة.",
        passingScore: "50",
        totalScore: "100",
        canGoBack: true,
        canSkip: true,
        showResultImmediately: true,
        maxAttempts: 3,
        
        isAvailable: true,
      },
      {
        title: "امتحان الفيزياء - الوحدة الأولى",
        subjectId: physicsId,
        type: "unit",
        difficulty: "medium",
        durationMinutes: 60,
        instructions: "أجب عن جميع الأسئلة.",
        passingScore: "50",
        totalScore: "100",
        canGoBack: true,
        canSkip: true,
        showResultImmediately: true,
        maxAttempts: 5,
        
        isAvailable: true,
      },
      {
        title: "اختبار تشخيصي - الكيمياء",
        subjectId: chemId,
        type: "diagnostic",
        difficulty: "medium",
        durationMinutes: 45,
        instructions: "هذا اختبار تشخيصي لتحديد مستواك.",
        passingScore: "40",
        totalScore: "100",
        canGoBack: false,
        canSkip: true,
        showResultImmediately: true,
        maxAttempts: 2,
        
        isAvailable: true,
      },
    ])
    .returning();

  console.log(`✅ Inserted ${exams.length} exams`);

  // Add sample MCQ questions to the first exam
  const mathExamId = exams[0]!.id;
  const questions = await db
    .insert(questionsTable)
    .values([
      {
        examId: mathExamId,
        text: "إذا كانت f(x) = x² + 2x + 1، فما قيمة f(3)؟",
        type: "mcq",
        order: 1,
        score: "1",
        correctAnswer: "A",
      },
      {
        examId: mathExamId,
        text: "حدد مجال الدالة f(x) = √(x - 4)",
        type: "mcq",
        order: 2,
        score: "1",
        correctAnswer: "B",
      },
      {
        examId: mathExamId,
        text: "ما مشتق الدالة f(x) = 3x³ - 2x² + 5x - 7؟",
        type: "mcq",
        order: 3,
        score: "1",
        correctAnswer: "A",
      },
    ])
    .returning();

  for (const q of questions) {
    if (q.order === 1) {
      await db.insert(questionChoicesTable).values([
        { questionId: q.id, choiceKey: "A", text: "16", order: 1 },
        { questionId: q.id, choiceKey: "B", text: "12", order: 2 },
        { questionId: q.id, choiceKey: "C", text: "14", order: 3 },
        { questionId: q.id, choiceKey: "D", text: "10", order: 4 },
      ]);
    } else if (q.order === 2) {
      await db.insert(questionChoicesTable).values([
        { questionId: q.id, choiceKey: "A", text: "x > 4", order: 1 },
        { questionId: q.id, choiceKey: "B", text: "x ≥ 4", order: 2 },
        { questionId: q.id, choiceKey: "C", text: "x < 4", order: 3 },
        { questionId: q.id, choiceKey: "D", text: "x ≤ 4", order: 4 },
      ]);
    } else if (q.order === 3) {
      await db.insert(questionChoicesTable).values([
        { questionId: q.id, choiceKey: "A", text: "9x² - 4x + 5", order: 1 },
        { questionId: q.id, choiceKey: "B", text: "3x² - 2x + 5", order: 2 },
        { questionId: q.id, choiceKey: "C", text: "9x² - 4x", order: 3 },
        { questionId: q.id, choiceKey: "D", text: "6x - 2", order: 4 },
      ]);
    }
  }

  // ─── ACHIEVEMENTS ───────────────────────────────────────────
  await db.insert(achievementsTable).values([
    {
      title: "الطالب المثالي",
      description: "أكمل 7 أيام متتالية من الدراسة",
      icon: "Star",
      condition: "streak_7",
    },
    {
      title: "القارئ النشيط",
      description: "اقرأ 10 دوسيات",
      icon: "BookOpen",
      condition: "dossiers_10",
    },
    {
      title: "المتفوق",
      description: "احصل على 90% في امتحان",
      icon: "Trophy",
      condition: "exam_90",
    },
    {
      title: "بطل الكويز",
      description: "احتل المركز الأول في الكويز الأسبوعي",
      icon: "Award",
      condition: "quiz_first",
    },
    {
      title: "الساعة 100",
      description: "أكمل 100 ساعة دراسة",
      icon: "Clock",
      condition: "hours_100",
    },
    {
      title: "المثابر",
      description: "أكمل 30 يوماً متتالياً من الدراسة",
      icon: "Flame",
      condition: "streak_30",
    },
  ]);

  console.log("✅ Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
