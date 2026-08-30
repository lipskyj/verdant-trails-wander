/**
 * Curriculum infrastructure for "מבוך האור".
 * Each room in the maze is one lesson unit. Adding a future lesson = adding an
 * entry to LESSONS below (no changes to the game shell required).
 */

export type LightRole = 'producer' | 'reflector';

export type SortingItem = {
  id: number;
  name: string;
  type: LightRole;
  icon: string;
  color: number;
  realWorld: string;
};

export type LessonRoom = {
  /** stable slug used for routing / progress storage */
  slug: string;
  order: number;
  title: string;
  subject: string;
  targetGrade: string;
  badge: string;
  /** which interactive module renders this room */
  activity: 'sorting-lab' | 'dark-box' | 'transparency';
  status: 'available' | 'coming-soon';
  reward?: { icon: string; name: string };
  bloom: string[];
  narrative: {
    intro: string;
    task: string;
    peerCheck: string;
    unlocked: string;
  };
  items: readonly SortingItem[];
};

export const ROOM_1: LessonRoom = {
  slug: 'producers-vs-reflectors',
  order: 1,
  title: 'מועדון החוקרים: מבוך האור - חדר 1',
  subject: 'אנרגיית קרינה (אור)',
  targetGrade: "כיתה ו'",
  badge: 'כיתה ו׳ | פיילוט אמי״ת',
  activity: 'sorting-lab',
  status: 'available',
  reward: { icon: '🔦', name: 'פנס קסם' },
  bloom: ['מיון וסיווג', 'הסקת מסקנות מתוך מדידה', 'יישום בעולם האמת'],
  narrative: {
    intro:
      'מסיבת ההפתעה עומדת להתחיל, אך לפתע... האורות מתחילים לעמעם והצבעים בסביבה מאיימים להיעלם! עזרו להציל את החגיגה על ידי הבנת חוקי האור.',
    task: 'שלב 1: בחרו את מסלול החקר שלכם וזהו את גופים מפיקי האור לעומת מחזירי האור.',
    peerCheck:
      'הסתכלו על חבר/ה שיושב/ת לידכם בכיתה. האם שניהם הגעתם לאותה מסקנה לגבי ההבדל בין הירח (מחזיר אור) לשמש (מפיק אור)? הסבירו אחד לשני בקצרה לפני שתקבלו את הפנס.',
    unlocked:
      'החדר החשוך הבא במבוך נפתח. כעת תוכלו להמשיך לחקור את התקדמות האור בקו ישר דרך תיבה אפלה.',
  },
  items: [
    { id: 1, name: 'שמש', type: 'producer', icon: '☀️', color: 0xfacc15, realWorld: 'כוכב המאיר מכוח עצמו במערכת השמש.' },
    { id: 2, name: 'מראה', type: 'reflector', icon: '🪞', color: 0xa78bfa, realWorld: 'משטח חלק המחזיר אלינו את אור השמש.' },
    { id: 3, name: 'נורה חשמלית', type: 'producer', icon: '💡', color: 0xfde68a, realWorld: 'מכשיר הממיר אנרגיה חשמלית לאור מלאכותי בביתנו.' },
    { id: 4, name: 'ירח', type: 'reflector', icon: '🌙', color: 0xc4b5fd, realWorld: 'גוף שמימי שאינו מאיר בעצמו אלא מחזיר את אור השמש.' },
    { id: 5, name: 'גחלילית', type: 'producer', icon: '🐛', color: 0x86efac, realWorld: 'חרק המייצר אור ביולוגי טבעי בטבע.' },
    { id: 6, name: 'כדור הארץ', type: 'reflector', icon: '🌍', color: 0x60a5fa, realWorld: 'כוכב לכת המחזיר לחלל חלק מאור השמש הפוגע בו.' },
  ],
};

export const ROOM_2: LessonRoom = {
  slug: 'straight-line',
  order: 2,
  title: 'חדר 2: התיבה האפלה והצינור',
  subject: 'האור מתקדם בקו ישר',
  targetGrade: "כיתה ו'",
  badge: 'כיתה ו׳ | פיילוט אמי״ת',
  activity: 'dark-box',
  status: 'available',
  reward: { icon: '📏', name: 'צינור החוקרים' },
  bloom: ['תכנון ניסוי', 'חיזוי', 'הסבר תופעה'],
  narrative: {
    intro: 'תיבה אפלה, שני חורים וצינור אחד — האם האור יצליח להגיע לעין דרך צינור מכופף?',
    task: 'כוונו את הפנס אל פתח התיבה ובדקו מתי הנקודה המוארת נראית.',
    peerCheck: 'השוו תחזיות עם חבר/ה: מה יקרה כשנכופף את הצינור?',
    unlocked: 'גיליתם שהאור מתקדם בקו ישר. השער הבא נפתח.',
  },
  items: [],
};

export type MaterialClass = 'transparent' | 'translucent' | 'opaque';

export type MaterialSample = {
  id: number;
  name: string;
  icon: string;
  /** 0..1 fraction of light passing through */
  transmission: number;
  klass: MaterialClass;
  color: number;
  realWorld: string;
};

export const ROOM_3_SAMPLES: readonly MaterialSample[] = [
  { id: 1, name: 'זכוכית שקופה', icon: '🪟', transmission: 0.92, klass: 'transparent', color: 0xbfe6ff, realWorld: 'חלון בבית — רואים דרכו בבירור, כמעט כל האור עובר.' },
  { id: 2, name: 'מים בכוס', icon: '💧', transmission: 0.85, klass: 'transparent', color: 0x9fd8ff, realWorld: 'מים נקיים מעבירים אור, ולכן רואים את קרקעית הבריכה.' },
  { id: 3, name: 'נייר אפייה', icon: '📄', transmission: 0.45, klass: 'translucent', color: 0xf3ecd7, realWorld: 'רואים כתם אור מטושטש — כמו אבוקה מבעד לווילון.' },
  { id: 4, name: 'שקית פלסטיק חלבית', icon: '🛍️', transmission: 0.35, klass: 'translucent', color: 0xe6ecf2, realWorld: 'אור עובר חלקית, אך לא רואים את הצורה שמעבר.' },
  { id: 5, name: 'קרטון', icon: '📦', transmission: 0.02, klass: 'opaque', color: 0xb98a5a, realWorld: 'חוסם את האור לחלוטין ויוצר צל מוחלט.' },
  { id: 6, name: 'לוח מתכת', icon: '🔩', transmission: 0.0, klass: 'opaque', color: 0x9aa6b2, realWorld: 'אטום לגמרי — האור לא עובר, אלא מוחזר.' },
];

export const ROOM_3: LessonRoom = {
  slug: 'transparent-opaque',
  order: 3,
  title: 'חדר 3: שקוף, חלקית או אטום?',
  subject: 'שקיפות ואטימות חומרים',
  targetGrade: "כיתה ו'",
  badge: 'כיתה ו׳ | פיילוט אמי״ת',
  activity: 'transparency',
  status: 'available',
  reward: { icon: '🔬', name: 'עדשת החוקרים' },
  bloom: ['מיון חומרים', 'מדידה והשוואה', 'הכללה'],
  narrative: {
    intro:
      'בקצה המבוך יש דלת סגורה, ורק אור אחד יכול להעיר את הצבעים שמעברה. על שולחן הניסוי שש דוגמאות חומר — האירו על כל אחת, מדדו כמה אור עבר אל המסך, וקבעו אם החומר שקוף, מעביר אור חלקית, או אטום.',
    task: 'בחרו דוגמה, הדליקו את המנורה, קראו את המדידה על המסך — ואז סמנו לאיזו קבוצה החומר שייך.',
    peerCheck: 'סכמו יחד עם חבר/ה: מה מאפיין חומר שקוף לעומת חומר אטום, ואיזה חומר בכיתה שייך לכל קבוצה?',
    unlocked: 'סיימתם את מבוך האור — הצבעים חזרו והמסיבה יכולה להתחיל! 🎉',
  },
  items: [],
};

export const LESSONS: readonly LessonRoom[] = [ROOM_1, ROOM_2, ROOM_3];

export const getLesson = (slug: string) => LESSONS.find((l) => l.slug === slug);

