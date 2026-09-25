export interface Passage {
  id: number;
  title: string;
  range: [number, number];
  text: string;
}

export type QuestionType = 'single' | 'multi' | 'table';

export interface Question {
  id: number;
  passageId: number;
  type: QuestionType;
  text: string;
  opts?: string[];
  rows?: string[];
  cols?: string[];
  ans: string | string[];
}

export const EXAM_CONFIG = {
  title: 'Try Out TKA Bahasa Inggris SMK',
  subtitle: 'Dinas Pendidikan dan Kebudayaan Provinsi Gorontalo — Tahun 2026',
  durationMinutes: 90,
  durationSeconds: 90 * 60,
  maxViolations: 3,
  adminPasscode: 'guru123',
  defaultToken: 'TKA2026',
};

export const PASSAGES: Passage[] = [
  {
    id: 1,
    title: 'Bacaan 1: Swimming with Whale Sharks in Botubarani Bay, Gorontalo',
    range: [1, 6],
    text: `The Ombak Putih was in the bay near Bolango Botubarani Village, Gorontalo. It is one of the best places in Indonesia to swim with whale sharks. We travelled for 12 hours from Bali, changing planes in Surabaya and Makassar. When we arrived, we heard good news. Three whale sharks had been seen in the bay. Local fishermen fed them with shrimp shells and heads from a nearby factory, so the sharks often came back.

The next morning, we woke up early. We were excited but also afraid that the sharks might not appear. Soon, we heard that three whale sharks were in the bay. We quickly took our masks and snorkels and went to the feeding area. It was only about 20 metres from the shore.

We saw the whale sharks near the surface. They can grow up to 12 metres long and weigh up to 20 tonnes. Although they are very large, they are gentle animals. They eat tiny sea animals and plankton. They are not aggressive toward people.

I carefully entered the water and came face to face with a whale shark. It was an amazing experience. The shark moved slowly and smoothly. Its grey skin had beautiful yellow spots and lines. We were told not to touch the sharks because their large tails could hurt us.

I felt amazed and very lucky to see such a huge and gentle animal so closely. The experience also brought our group closer together. We shared photos and stories about the whale sharks. Although we were strangers before, we became good friends after the experience.`,
  },
  {
    id: 2,
    title: 'Bacaan 2: The Legend of Lahilote',
    range: [7, 12],
    text: `Long ago, there lived a humble young man named Lalihote in a village in Gorontalo. He lived near a river and worked in the forest by collecting rattan.

One night, Lalihote had a strange dream. In his dream, he received a very large piece of magical rattan called "Hutiya Mala." A few days later, while walking to the forest, he saw seven beautiful fairies bathing in the river. Their magical scarves, called selendangs, were on the riverbank. The fairies used the scarves as wings to fly.

Lalihote secretly took one of the scarves and hid it. When the fairies finished bathing, six of them flew to heaven. One fairy could not find her scarf, so she stayed behind and cried. Lalihote comforted her and asked her to marry him. She agreed, and they became husband and wife.

One day, Lalihote went to the forest. While he was away, his wife found her missing scarf inside a bamboo tube. She was happy but angry because Lalihote had hidden it from her. She put on the scarf and flew back to heaven.

Lalihote was very sad. A wise Polahi man gave him a magical piece of rattan that could help him fly to heaven. Lalihote followed his wife and was allowed to stay there.

However, one day his wife found some gray hairs on his head. She told him that people with gray hair could not stay in heaven. Lalihote was heartbroken and returned to earth.

Before leaving, he made a promise that his left footprint would remain forever on Pohe Beach. Today, local people believe that a footprint on a stone at Pohe Beach is Lalihote's footprint.`,
  },
  {
    id: 3,
    title: 'Bacaan 3: Lionel Messi',
    range: [13, 18],
    text: `Lionel Messi is considered one of the greatest soccer players in history. He is a talented athlete known for his amazing skills and achievements. Messi was born on June 24, 1987, in Rosario, Argentina.

Messi is famous for his skill, speed, and creativity. He has excellent ball control and can move the ball easily past defenders. His accurate passing and shooting are also important parts of his playing style. In addition, he has great balance and agility, which help him move quickly and stay in control during difficult situations.

Messi is also known for his excellent understanding of the game. He can see open spaces, make quick decisions, and create chances for himself and his teammates. He has scored many goals and broken several records during his career.

Besides his football skills, Messi has a professional attitude. He works hard, gives his best in every match, and respects his teammates and the game. Although he has achieved great success, he is known for remaining humble. Messi has won many important titles and awards. With Barcelona, he won Spanish La Liga titles, the UEFA Champions League, and the FIFA Club World Cup. He also represented Argentina and won the Copa America in 2021.

Outside football, Messi supports children through his charitable foundation. His work helps children in need and supports positive social programs. With his talent, achievements, and dedication, Messi has become a famous football icon. He continues to inspire young players around the world.

(Informasi tambahan dari FIFA: Lionel Messi juga membawa Argentina menjadi juara Piala Dunia FIFA 2022.)`,
  },
  {
    id: 4,
    title: 'Bacaan 4: Do These 6 Things Every Day to Become Fluent in English',
    range: [19, 24],
    text: `(Infografis "Do These 6 Things Every Day to Become Fluent in English")

1. Speak English Daily - Prioritize active speaking practice over passively studying grammar rules or reading textbooks. If practicing alone, talk out loud to yourself, read passages aloud, or use language exchange apps to connect with conversation partners.

2. Change Your Tech Settings - Switch the display language on your phone, computer, and social media platforms to English. This simple digital habit forces your brain to absorb practical, everyday vocabulary each time you check your screen. Follow English-speaking content creators for daily exposure.

3. Listen Throughout the Day - Incorporate passive listening by playing podcasts, audiobooks, or videos in the background while cooking, cleaning, or commuting. Choose topics you genuinely enjoy so you naturally adapt to conversational flow, rhythm, and intonation without feeling overwhelmed.

4. Practice Mirror Pronunciation - Observe your mouth movements in a mirror while practicing tricky sounds, such as "th," "v," "w," or short versus long vowels (like ship versus sheep). Mimic native speakers to master mouth shaping, word stress, and sound linking.

5. Keep a Daily Journal - Dedicate 5 to 10 minutes each day to write 1-2 short paragraphs about your thoughts, meals, or daily activities. Regular journaling strengthens sentence structuring, reinforces new vocabulary, and provides a clear record of your progress over time.

6. Converse with Native Speakers - Engage in real-time conversations using language exchange apps or local expat groups. Live practice forces you to think faster in English, overcoming hesitation and building listening confidence without the fear of making mistakes.`,
  },
  {
    id: 5,
    title: 'Bacaan 5: The Importance of Sleep for Health',
    range: [25, 30],
    text: `Sleep plays a vital role in good health and well-being for the rest of your life. Adequate quality sleep at the right time can help to protect your mental health, quality of life, physical health, and safety. Why is sleep so important? Sleep can help your brain work properly. When you sleep, your brain prepares to run the next day. This will undoubtedly form a new path to help you learn and remember information.

Studies suggest that a good night's sleep can improve learning. Whether you're learning how to play the piano, do the math, play golf, or drive a car, sleep will help you improve your learning and problem-solving skills. Sleep will also help you make decisions, pay attention, and be creative.

Physical health is often also related to the quality of sleep. That's why sleep plays a vital role in your physical health. For example, rest is involved in healing and repairing your heart and blood vessels.

Sustained sleep deprivation is associated with an increased risk of kidney disease, heart disease, high blood pressure, stroke, and diabetes. Sleep can also help maintain a healthy balance of hormones that make you feel hungry (ghrelin)/full (leptin). When you don't get enough sleep, your ghrelin level will go up, and your leptin level will drop. That will make you feel more hungry than when you get enough rest.

Those benefits of the importance of sleep for health are presented. There are a lot of benefits of sleep to get better health, not only physically but also mentally. That's why sleep is the activity that we should be concerned about for getting a healthy life.`,
  },
];

export const QUESTIONS: Question[] = [
  // Passage 1 (Q1-Q6)
  {
    id: 1,
    passageId: 1,
    type: 'single',
    text: 'What did the local fishermen use to feed the whale sharks?',
    opts: [
      'Small fish and pieces of seaweed',
      'Shrimp shells and heads from a factory',
      'Plankton and tiny animals from the bay',
      'Pieces of food collected from the village',
      'Small sea animals caught near the shore',
    ],
    ans: 'B',
  },
  {
    id: 2,
    passageId: 1,
    type: 'table',
    text: 'Classify each piece of information according to the category it belongs to.',
    rows: ['Shrimp Shells', 'Shared photos and stories', 'Bolango Botubarani village'],
    cols: ['Place', 'Thing', 'Activity'],
    ans: ['Thing', 'Activity', 'Place'],
  },
  {
    id: 3,
    passageId: 1,
    type: 'single',
    text: 'What would most likely happen if the whale sharks did not return to the bay the next morning?',
    opts: [
      'The group would probably be disappointed because they had expected to see them',
      'The fishermen would probably move the boat farther away from the shore',
      'The group would probably spend the morning feeding the sharks themselves',
      'The narrator would probably decide to touch the sharks before leaving',
      'The local factory would probably stop producing shrimp products immediately',
    ],
    ans: 'A',
  },
  {
    id: 4,
    passageId: 1,
    type: 'multi',
    text: 'Which statements are supported by the information in the text? (pilih semua yang benar)',
    opts: [
      'The whale sharks can grow to a very large size',
      'The whale sharks usually behave aggressively toward people',
      'The whale sharks feed on tiny sea animals and plankton',
      'The whale sharks have grey skin with yellow spots and lines',
      'The whale sharks quickly moved away when the narrator entered the water',
    ],
    ans: ['A', 'C', 'D'],
  },
  {
    id: 5,
    passageId: 1,
    type: 'single',
    text: 'Which part of the text best shows that the narrator felt amazed and grateful about the experience?',
    opts: [
      'We woke up early and went to the feeding area',
      'We saw the whale sharks near the surface',
      'I carefully entered the water and saw a whale shark',
      'I felt amazed and very lucky to see such a huge animal',
      'We shared photos and stories about the whale sharks',
    ],
    ans: 'D',
  },
  {
    id: 6,
    passageId: 1,
    type: 'single',
    text: 'Which detail best shows that the narrator was careful and respectful toward the whale sharks?',
    opts: [
      'The narrator quickly took the snorkel and joined the group at the feeding area',
      'The narrator closely watched the sharks and admired their beautiful yellow spots',
      'The narrator carefully entered the water and followed the advice not to touch them',
      'The narrator happily shared photos and stories with the group after the experience',
      'The narrator excitedly watched the sharks and enjoyed swimming near them',
    ],
    ans: 'C',
  },

  // Passage 2 (Q7-Q12)
  {
    id: 7,
    passageId: 2,
    type: 'multi',
    text: "How did Lahilote's actions affect the events in the story? (pilih semua yang benar, berdasarkan informasi eksplisit)",
    opts: [
      'Hiding the scarf caused one fairy to remain on earth.',
      'Comforting the fairy led to their marriage.',
      'Finding the scarf caused the fairy to return to heaven.',
      'Keeping the scarf allowed Lahilote to stay in heaven.',
      'Finding gray hair allowed Lahilote to remain in heaven.',
    ],
    ans: ['A', 'B', 'C'],
  },
  {
    id: 8,
    passageId: 2,
    type: 'table',
    text: 'Read each classification below. Write True if correct and False if incorrect based on the story.',
    rows: [
      'Lahilote is classified as a character in the story',
      'Hutiya Mala is classified as a place in the story',
      'Pohe Beach is classified as an event in the story',
    ],
    cols: ['True', 'False'],
    ans: ['True', 'False', 'False'],
  },
  {
    id: 9,
    passageId: 2,
    type: 'single',
    text: "After Lahilote's wife flew back to heaven, what would Lahilote most likely do next?",
    opts: [
      'He would return to the forest and continue collecting rattan.',
      'He would search for a way to follow his wife.',
      'He would ask the fairies to bring his wife back.',
      'He would hide the magical scarf in the forest.',
      'He would wait for his wife to return home.',
    ],
    ans: 'B',
  },
  {
    id: 10,
    passageId: 2,
    type: 'single',
    text: 'How were Lahilote and his wife different in their actions toward the scarf?',
    opts: [
      'Lahilote hid the scarf, while his wife used it to fly.',
      'Lahilote used the scarf, while his wife hid it away.',
      'Lahilote returned the scarf, while his wife kept it.',
      'Lahilote found the scarf, while his wife lost it.',
      'Lahilote gave the scarf, while his wife returned it.',
    ],
    ans: 'A',
  },
  {
    id: 11,
    passageId: 2,
    type: 'single',
    text: 'Which statement expresses an opinion rather than a fact stated in the story?',
    opts: [
      'Lahilote lived in a village in Gorontalo.',
      'Lahilote collected rattan in the forest.',
      'His wife found the scarf inside a bamboo tube.',
      'Lahilote followed his wife to heaven with rattan.',
      'The story of Lahilote is an inspiring local story.',
    ],
    ans: 'E',
  },
  {
    id: 12,
    passageId: 2,
    type: 'single',
    text: 'Which statement is accurate according to the text?',
    opts: [
      'Lahilote left his footprint inside the forest area.',
      'Lahilote lived in heaven and collected rattan there.',
      'His wife gave him magical rattan to fly upward.',
      'Lahilote lived near a river and collected rattan.',
      'Lahilote found the scarf while working in the forest.',
    ],
    ans: 'D',
  },

  // Passage 3 (Q13-Q18)
  {
    id: 13,
    passageId: 3,
    type: 'single',
    text: 'Where was Lionel Messi born?',
    opts: [
      'Buenos Aires, Argentina',
      'Rosario, Argentina',
      'Barcelona, Spain',
      'Madrid, Spain',
      'Córdoba, Argentina',
    ],
    ans: 'B',
  },
  {
    id: 14,
    passageId: 3,
    type: 'single',
    text: "Which group contains only characteristics of Messi's playing style mentioned in the text?",
    opts: [
      'Speed, creativity, balance, and agility',
      'Humility, charity, respect, and dedication',
      'Speed, charity, passing, and humility',
      'Creativity, foundation, shooting, and respect',
      'Balance, awards, teamwork, and charity',
    ],
    ans: 'A',
  },
  {
    id: 15,
    passageId: 3,
    type: 'multi',
    text: 'Based on the final paragraph, which TWO topics are most likely to be discussed if the text continues?',
    opts: [
      "Messi's influence on young football players",
      'The history of football in Rosario, Argentina',
      "Messi's future involvement in helping children",
      'The detailed rules of the UEFA Champions League',
      "The training methods used by Messi's former teammates",
    ],
    ans: ['A', 'C'],
  },
  {
    id: 16,
    passageId: 3,
    type: 'single',
    text: 'What can be inferred about Messi\'s characteristics as a football player and as a person?',
    opts: [
      'He is fast on the field and famous for avoiding social responsibility',
      'He is creative on the field and competitive in his social activities',
      'He is skillful on the field and humble in his personal attitude',
      'He is successful on the field and unwilling to support other people',
      'He is talented on the field and mainly interested in winning awards',
    ],
    ans: 'C',
  },
  {
    id: 17,
    passageId: 3,
    type: 'table',
    text: 'Based on the descriptive text and the additional information from FIFA, classify each statement.',
    rows: [
      'Messi won the Copa América in 2021 with Argentina.',
      'Messi won the FIFA World Cup in 2022 with Argentina.',
      'Messi won the Copa América 2021 while playing for Barcelona.',
    ],
    cols: ['Accurate', 'Needs Correction'],
    ans: ['Accurate', 'Accurate', 'Needs Correction'],
  },
  {
    id: 18,
    passageId: 3,
    type: 'single',
    text: 'Which part of the text best shows that Messi is humble and professional?',
    opts: [
      'He works hard and respects his teammates',
      'He has won many important titles',
      'He makes quick decisions',
      'He has scored many goals',
      'He has good ball control',
    ],
    ans: 'A',
  },

  // Passage 4 (Q19-Q24)
  {
    id: 19,
    passageId: 4,
    type: 'single',
    text: 'Which sequence correctly summarizes the six daily activities?',
    opts: [
      'Speak English, change tech settings, listen, practice pronunciation, journal, and talk to native speakers',
      'Listen to English, speak daily, write a journal, change tech settings, read books, and study grammar.',
      'Change tech settings, listen to English, study grammar, speak daily, write emails, and keep a journal.',
      'Speak English, read textbooks, listen to podcasts, study grammar, write journals, and use language apps.',
      'Listen to English, change tech settings, practice sounds, read books, write journals, and study grammar.',
    ],
    ans: 'A',
  },
  {
    id: 20,
    passageId: 4,
    type: 'single',
    text: 'Which activity best supports the idea of regular English practice?',
    opts: [
      'Practice pronunciation daily because it develops only written English skills',
      'Listen to English daily because it replaces the need for other language skills',
      'Keep a daily journal because it gives regular writing practice every day',
      'Change tech settings because it removes the need for regular language practice',
      'Follow English creators because watching videos is enough for language learning.',
    ],
    ans: 'C',
  },
  {
    id: 21,
    passageId: 4,
    type: 'table',
    text: 'After a learner finishes "Keep a Daily Journal," which activities are suitable to continue the daily English practice?',
    rows: [
      'Avoid using new vocabulary',
      'Converse with Native Speakers',
      'Stop listening to English',
    ],
    cols: ['Can be done next', 'Can not be done next'],
    ans: ['Can not be done next', 'Can be done next', 'Can not be done next'],
  },
  {
    id: 22,
    passageId: 4,
    type: 'single',
    text: 'What is the main difference between "Speak English Daily" and "Converse with Native Speakers"?',
    opts: [
      'The first uses technology, while the second uses a daily journal.',
      'The first can be done alone, while the second needs a conversation',
      'The first is for beginners, while the second is for advanced learners',
      'The first uses writing practice, while the second uses reading practice',
      'The first practices pronunciation, while the second practices grammar',
    ],
    ans: 'B',
  },
  {
    id: 23,
    passageId: 4,
    type: 'multi',
    text: 'A student wants to improve her English for future workplace communication. Which activities could she realistically apply? (pilih semua yang benar)',
    opts: [
      'Writing a short journal about her daily activities',
      'Speaking English aloud while preparing for work',
      'Avoiding conversations until her English is perfect',
      'Listening to English podcasts while travelling to school',
      'Studying English grammar without practicing communication',
    ],
    ans: ['A', 'B', 'D'],
  },
  {
    id: 24,
    passageId: 4,
    type: 'single',
    text: 'Which statement is supported by the text?',
    opts: [
      'Listening to English is more important than speaking English',
      'Talking to native speakers can remove the fear of mistakes',
      'Changing tech settings can make English fluent quickly',
      'Daily journaling can improve sentences and vocabulary',
      'Mirror practice is needed by every English learner',
    ],
    ans: 'D',
  },

  // Passage 5 (Q25-Q30)
  {
    id: 25,
    passageId: 5,
    type: 'table',
    text: 'Read the statements below. Classify each statement according to its role in the text.',
    rows: [
      'Sleep is important for maintaining a healthy life',
      'Sleep affects hormones that control hunger and fullness',
      'Sleep helps the body repair the heart and blood vessels',
    ],
    cols: ['Benefits and Effects of Sleep', "Writer's Main Argument"],
    ans: ["Writer's Main Argument", 'Benefits and Effects of Sleep', 'Benefits and Effects of Sleep'],
  },
  {
    id: 26,
    passageId: 5,
    type: 'single',
    text: 'Which of the following is the most appropriate summary of the text?',
    opts: [
      'Sleep supports the brain and body, helping people stay healthy and active.',
      'Sleep supports mental and physical health, helping people live a healthier life.',
      'Sleep helps people learn, think, and solve problems during their daily activities.',
      'Sleep helps the body recover and reduces several health risks caused by poor rest.',
      'Sleep helps the brain prepare for learning and the body recover from daily activities.',
    ],
    ans: 'B',
  },
  {
    id: 27,
    passageId: 5,
    type: 'single',
    text: "Which additional fact would most strongly support the writer's argument about sleep?",
    opts: [
      'People have different preferences for their sleeping environment at night.',
      'People use their bedrooms for different activities before going to sleep.',
      'Enough sleep can improve attention and daily performance in many activities.',
      'People have different sleeping habits based on their daily schedules.',
      'People may choose different bedtime routines according to their needs.',
    ],
    ans: 'C',
  },
  {
    id: 28,
    passageId: 5,
    type: 'single',
    text: "What is the writer's main purpose in presenting the information in the text?",
    opts: [
      'To describe different sleeping habits that people have in their daily lives.',
      'To explain how sleep affects the brain and body during the night.',
      'To persuade readers that enough sleep is important for maintaining good health.',
      'To compare the effects of sleeping well and getting insufficient sleep.',
      'To inform readers about health problems related to insufficient sleep.',
    ],
    ans: 'C',
  },
  {
    id: 29,
    passageId: 5,
    type: 'multi',
    text: 'Which statements are adequately supported by the information in the text? (pilih semua yang benar)',
    opts: [
      'Sleep helps the brain learn and remember information better.',
      'Sleep supports physical health by helping the body recover.',
      'Lack of sleep may increase the risk of several health problems.',
      'Enough sleep can completely prevent people from getting diseases.',
      'Lack of sleep makes people feel less hungry during the day.',
    ],
    ans: ['A', 'B', 'C'],
  },
  {
    id: 30,
    passageId: 5,
    type: 'single',
    text: "Which additional statement would best strengthen the writer's main argument?",
    opts: [
      'People can choose different sleeping positions based on their personal comfort.',
      'A regular sleep schedule can help people prepare for the following day.',
      'People can spend their free time doing various activities before bedtime.',
      'Bedrooms can have different colors and furniture to create a pleasant atmosphere.',
      'People can have different opinions about how much sleep they need each night.',
    ],
    ans: 'B',
  },
];

export function calculateScore(answers: Record<number, any>): number {
  let totalPoints = 0;
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (a === undefined || a === null) continue;

    if (q.type === 'single') {
      if (a === q.ans) totalPoints += 1;
    } else if (q.type === 'multi') {
      if (
        Array.isArray(a) &&
        Array.isArray(q.ans) &&
        a.length === q.ans.length &&
        [...a].sort().join(',') === [...q.ans].sort().join(',')
      ) {
        totalPoints += 1;
      }
    } else if (q.type === 'table') {
      if (Array.isArray(a) && Array.isArray(q.ans)) {
        let correctRows = 0;
        q.ans.forEach((val, i) => {
          if (a[i] === val) correctRows++;
        });
        totalPoints += correctRows / q.ans.length;
      }
    }
  }
  return Math.round((totalPoints / QUESTIONS.length) * 100);
}
