import { ECurrency, Prisma, PrismaClient, Role, VerificationStatus } from '@mezon-tutors/db';
import {
  ECountry,
  ELanguage,
  EProficiencyLevel,
  ESubject,
  MAX_PRICE,
  MIN_PRICE,
  PRICE_STEP,
} from '@mezon-tutors/shared';

const AVATAR_URL =
  'https://scontent.fdad3-4.fna.fbcdn.net/v/t39.30808-1/686227839_2468126076944716_6947914293899172557_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeE_X2ZyTnY9hX4FKWOmtXy0yRcKOLCTFx7JFwo4sJMXHlZqYI_JoOK_WeCpmQf46KDz3ANuXZvgl6ENo2Awqv25&_nc_ohc=Za1r2EJuT78Q7kNvwHkjHEE&_nc_oc=AdocZlRJG6JoM1Yrq1IBsbgEM9lRwMoj0wZev8XW_IKarZ8Qy_pRhIFdeyHtyI6JQzI&_nc_zt=24&_nc_ht=scontent.fdad3-4.fna&_nc_gid=fewfvbUdefmFRUT0CrFHoA&_nc_ss=7b2a8&oh=00_Af4kGZZId3iWoeFVMSPsrM2gb7lzFI3idV-xJImZ1el6cw&oe=69FE408D';
const VIDEO_URL = 'https://www.youtube.com/watch?v=9UcQ7ddVjoc&list=RD9UcQ7ddVjoc&start_radio=1';
const TUTOR_COUNT = 50;
const OVER_MAX_TUTOR_COUNT = 9;

const FIRST_NAMES = ['An', 'Binh', 'Chau', 'Dung', 'Giang', 'Hanh', 'Hieu', 'Khanh', 'Lan', 'Linh'];

const LAST_NAMES = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu', 'Dang', 'Bui', 'Do', 'Phan'];

const SUBJECTS: ESubject[] = [
  ESubject.ENGLISH,
  ESubject.MATH,
  ESubject.SCIENCE,
  ESubject.HISTORY,
  ESubject.SPANISH,
  ESubject.VIETNAMESE,
];
const COUNTRIES: ECountry[] = [ECountry.VIETNAM, ECountry.PHILIPPINES, ECountry.UNITED_STATES];
const LANGUAGES: ELanguage[] = [
  ELanguage.ENGLISH,
  ELanguage.VIETNAMESE,
  ELanguage.SPANISH,
  ELanguage.FRENCH,
  ELanguage.GERMAN,
  ELanguage.JAPANESE,
];
const PROFICIENCIES: EProficiencyLevel[] = [
  EProficiencyLevel.NATIVE,
  EProficiencyLevel.NEAR_NATIVE,
  EProficiencyLevel.ADVANCED,
  EProficiencyLevel.UPPER_INTERMEDIATE,
];
const AVAILABILITY_TEMPLATES = [
  [
    { dayOfWeek: 1, startTime: '08:00', endTime: '10:00' },
    { dayOfWeek: 3, startTime: '14:00', endTime: '16:00' },
    { dayOfWeek: 5, startTime: '19:00', endTime: '21:00' },
  ],
  [
    { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
    { dayOfWeek: 4, startTime: '15:00', endTime: '17:00' },
    { dayOfWeek: 6, startTime: '20:00', endTime: '22:00' },
  ],
  [
    { dayOfWeek: 0, startTime: '07:00', endTime: '09:00' },
    { dayOfWeek: 2, startTime: '13:00', endTime: '15:00' },
    { dayOfWeek: 4, startTime: '18:00', endTime: '20:00' },
  ],
];
const TIMEZONES = ['Asia/Ho_Chi_Minh', 'Asia/Manila', 'UTC'];
const CURRENCIES = [ECurrency.USD, ECurrency.VND, ECurrency.PHP] as const;

function toSafeStep(step: number) {
  return step > 0 ? step : 1;
}

function getDistributedPrice(
  min: number,
  max: number,
  step: number,
  position: number,
  total: number
) {
  if (total <= 1) return min;
  const raw = min + ((max - min) * position) / (total - 1);
  const safeStep = toSafeStep(step);
  const stepped = Math.round(raw / safeStep) * safeStep;
  return Math.max(min, Math.min(max, stepped));
}

function getTutorPricing(index: number) {
  if (index < OVER_MAX_TUTOR_COUNT) {
    const over = index + 1;
    const usd = MAX_PRICE[ECurrency.USD] + 5 + over;
    const vnd = MAX_PRICE[ECurrency.VND] + over * 100000;
    const php = MAX_PRICE[ECurrency.PHP] + over * 1000;

    return {
      usd: usd.toFixed(2),
      vnd: BigInt(vnd),
      php: php.toFixed(2),
    };
  }

  const inRangeIndex = index - OVER_MAX_TUTOR_COUNT;
  const inRangeTotal = TUTOR_COUNT - OVER_MAX_TUTOR_COUNT;

  const usd = getDistributedPrice(
    MIN_PRICE[ECurrency.USD],
    MAX_PRICE[ECurrency.USD],
    PRICE_STEP[ECurrency.USD],
    inRangeIndex,
    inRangeTotal
  );
  const vnd = getDistributedPrice(
    MIN_PRICE[ECurrency.VND],
    MAX_PRICE[ECurrency.VND],
    PRICE_STEP[ECurrency.VND],
    inRangeIndex,
    inRangeTotal
  );
  const php = getDistributedPrice(
    MIN_PRICE[ECurrency.PHP],
    MAX_PRICE[ECurrency.PHP],
    PRICE_STEP[ECurrency.PHP],
    inRangeIndex,
    inRangeTotal
  );

  return {
    usd: usd.toFixed(2),
    vnd: BigInt(vnd),
    php: php.toFixed(2),
  };
}

export async function seedTutorProfiles(prisma: PrismaClient): Promise<void> {
  console.log(`Seeding ${TUTOR_COUNT} tutors with full profile fields...`);

  for (let i = 0; i < TUTOR_COUNT; i += 1) {
    const seq = String(i + 1).padStart(3, '0');
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const subjectEnum = SUBJECTS[i % SUBJECTS.length];
    const countryEnum = COUNTRIES[i % COUNTRIES.length];
    const subject = subjectEnum;
    const country = countryEnum;
    const timezone = TIMEZONES[i % TIMEZONES.length];
    const baseCurrency = CURRENCIES[i % CURRENCIES.length] as ECurrency;
    const pricing = getTutorPricing(i);
    const email = `seed.tutor.${seq}@mezon.dev`;
    const mezonUserId = `seed-tutor-${seq}`;

    const user = await prisma.user.upsert({
      where: { mezonUserId },
      update: {
        username: `${firstName} ${lastName} ${seq}`,
        avatar: AVATAR_URL,
        role: Role.TUTOR,
        email,
      },
      create: {
        mezonUserId,
        username: `${firstName} ${lastName} ${seq}`,
        avatar: AVATAR_URL,
        role: Role.TUTOR,
        email,
      },
    });

    const tutorProfileData = {
      firstName,
      lastName,
      avatar: AVATAR_URL,
      videoUrl: VIDEO_URL,
      country,
      phone: `+84${String(900000000 + i)}`,
      email,
      subject,
      introduce: `Xin chao, minh la ${firstName} ${lastName}, tutor mon ${subject}.`,
      experience: `${2 + (i % 9)} nam kinh nghiem day hoc online va offline.`,
      motivate: 'Tap trung vao nang luc su dung ngon ngu va tu duy logic qua tung buoi hoc.',
      headline: `Tutor ${subject} - ${firstName} ${lastName}`,
      isProfessional: i % 2 === 0,
      verificationStatus: VerificationStatus.APPROVED,
      totalLessonsTaught: 20 + i * 3,
      totalStudents: 10 + (i % 30),
      ratingCount: 5 + (i % 45),
      ratingAverage: '4.80',
      timezone,
    };

    const tutorProfile = await prisma.tutorProfile.upsert({
      where: { userId: user.id },
      update: tutorProfileData as unknown as Prisma.TutorProfileUpdateInput,
      create: {
        userId: user.id,
        ...(tutorProfileData as unknown as Prisma.TutorProfileCreateInput),
      } as Prisma.TutorProfileCreateInput,
    });

    const trialLessonPriceDelegate = (
      prisma as unknown as {
        trialLessonPrice: {
          upsert: (args: {
            where: { tutorId: string };
            update: {
              baseCurrency: ECurrency;
              usd: string;
              vnd: bigint;
              php: string;
            };
            create: {
              tutorId: string;
              baseCurrency: ECurrency;
              usd: string;
              vnd: bigint;
              php: string;
            };
          }) => Promise<unknown>;
        };
      }
    ).trialLessonPrice;
    await trialLessonPriceDelegate.upsert({
      where: { tutorId: tutorProfile.id },
      update: {
        baseCurrency,
        usd: pricing.usd,
        vnd: pricing.vnd,
        php: pricing.php,
      },
      create: {
        tutorId: tutorProfile.id,
        baseCurrency,
        usd: pricing.usd,
        vnd: pricing.vnd,
        php: pricing.php,
      },
    });

    const tutorLanguages = [
      {
        languageCode: LANGUAGES[i % LANGUAGES.length]!,
        proficiency: PROFICIENCIES[0]!,
      },
      {
        languageCode: LANGUAGES[(i + 1) % LANGUAGES.length]!,
        proficiency: PROFICIENCIES[(i + 1) % PROFICIENCIES.length]!,
      },
      {
        languageCode: LANGUAGES[(i + 2) % LANGUAGES.length]!,
        proficiency: PROFICIENCIES[(i + 2) % PROFICIENCIES.length]!,
      },
    ];

    await prisma.tutorLanguage.deleteMany({
      where: { tutorId: tutorProfile.id },
    });

    await prisma.tutorLanguage.createMany({
      data: tutorLanguages.map((language) => ({
        tutorId: tutorProfile.id,
        languageCode: language.languageCode,
        proficiency: language.proficiency,
      })),
    });

    const tutorAvailability = AVAILABILITY_TEMPLATES[i % AVAILABILITY_TEMPLATES.length]!;

    await prisma.tutorAvailability.deleteMany({
      where: { tutorId: tutorProfile.id },
    });

    await prisma.tutorAvailability.createMany({
      data: tutorAvailability.map((slot) => ({
        tutorId: tutorProfile.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: true,
      })),
    });
  }
}
