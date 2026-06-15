// Curated quotes by category for the public "Love Quotes" landing. Reliable,
// no API key needed. The Love set leads with the four famous quotes requested.
// (Live "Quote of the Day" comes from the ZenQuotes API, server-side.)

export type Quote = { text: string; author: string; tags: string[] };

export const CATEGORIES = [
  'Love',
  'Life',
  'Happiness',
  'Inspiration',
  'Wisdom',
  'Friendship',
  'Hope',
  'Humor',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const QUOTES: Record<Category, Quote[]> = {
  Love: [
    {
      text: "I'm selfish, impatient and a little insecure. I make mistakes, I am out of control and at times hard to handle. But if you can't handle me at my worst, then you sure as hell don't deserve me at my best.",
      author: 'Marilyn Monroe',
      tags: ['attributed-no-source', 'best', 'life', 'love', 'mistakes'],
    },
    {
      text: "You've gotta dance like there's nobody watching,\nLove like you'll never be hurt,\nSing like there's nobody listening,\nAnd live like it's heaven on earth.",
      author: 'William W. Purkey',
      tags: ['dance', 'heaven', 'inspirational', 'life', 'love'],
    },
    {
      text: "You know you're in love when you can't fall asleep because reality is finally better than your dreams.",
      author: 'Dr. Seuss',
      tags: ['attributed-no-source', 'dreams', 'love', 'reality', 'sleep'],
    },
    {
      text: 'Darkness cannot drive out darkness: only light can do that. Hate cannot drive out hate: only love can do that.',
      author: 'Martin Luther King Jr.',
      tags: ['darkness', 'hate', 'inspirational', 'light', 'love', 'peace'],
    },
    {
      text: 'Whatever our souls are made of, his and mine are the same.',
      author: 'Emily Brontë, Wuthering Heights',
      tags: ['love', 'soul', 'soulmates'],
    },
    {
      text: 'If I know what love is, it is because of you.',
      author: 'Hermann Hesse',
      tags: ['love'],
    },
  ],
  Life: [
    {
      text: 'In three words I can sum up everything I have learned about life: it goes on.',
      author: 'Robert Frost',
      tags: ['life', 'optimism'],
    },
    {
      text: 'Life is what happens to us while we are making other plans.',
      author: 'Allen Saunders',
      tags: ['life', 'planning'],
    },
    {
      text: 'Not how long, but how well you have lived is the main thing.',
      author: 'Seneca',
      tags: ['life', 'philosophy'],
    },
    {
      text: 'You only live once, but if you do it right, once is enough.',
      author: 'Mae West',
      tags: ['life', 'humor'],
    },
    {
      text: 'Everything you can imagine is real.',
      author: 'Pablo Picasso',
      tags: ['imagination', 'life'],
    },
  ],
  Happiness: [
    {
      text: 'For every minute you are angry you lose sixty seconds of happiness.',
      author: 'Ralph Waldo Emerson',
      tags: ['anger', 'happiness'],
    },
    {
      text: 'Happiness is not something ready made. It comes from your own actions.',
      author: 'Dalai Lama XIV',
      tags: ['action', 'happiness'],
    },
    {
      text: 'The most important thing is to enjoy your life—to be happy—it’s all that matters.',
      author: 'Audrey Hepburn',
      tags: ['happiness', 'life'],
    },
    {
      text: 'Count your age by friends, not years. Count your life by smiles, not tears.',
      author: 'John Lennon',
      tags: ['friends', 'happiness', 'life'],
    },
  ],
  Inspiration: [
    {
      text: 'It is our choices, Harry, that show what we truly are, far more than our abilities.',
      author: 'J.K. Rowling, Harry Potter and the Chamber of Secrets',
      tags: ['abilities', 'choices', 'inspirational'],
    },
    {
      text: 'Without music, life would be a mistake.',
      author: 'Friedrich Nietzsche',
      tags: ['inspirational', 'music'],
    },
    {
      text: 'We accept the love we think we deserve.',
      author: 'Stephen Chbosky, The Perks of Being a Wallflower',
      tags: ['inspirational', 'love'],
    },
    {
      text: 'And, when you want something, all the universe conspires in helping you to achieve it.',
      author: 'Paulo Coelho, The Alchemist',
      tags: ['dreams', 'inspirational'],
    },
  ],
  Wisdom: [
    {
      text: 'The only true wisdom is in knowing you know nothing.',
      author: 'Socrates',
      tags: ['knowledge', 'wisdom'],
    },
    {
      text: 'Yesterday is history, tomorrow is a mystery, today is a gift of God, which is why we call it the present.',
      author: 'Bil Keane',
      tags: ['present', 'wisdom'],
    },
    {
      text: 'It does not matter how slowly you go as long as you do not stop.',
      author: 'Confucius',
      tags: ['perseverance', 'wisdom'],
    },
    {
      text: 'Knowing yourself is the beginning of all wisdom.',
      author: 'Aristotle',
      tags: ['self', 'wisdom'],
    },
  ],
  Friendship: [
    {
      text: 'A friend is someone who knows all about you and still loves you.',
      author: 'Elbert Hubbard',
      tags: ['friendship', 'love'],
    },
    {
      text: 'Friendship is born at that moment when one person says to another, “What! You too? I thought I was the only one.”',
      author: 'C.S. Lewis',
      tags: ['friendship'],
    },
    {
      text: 'There is nothing on this earth more to be prized than true friendship.',
      author: 'Thomas Aquinas',
      tags: ['friendship'],
    },
  ],
  Hope: [
    {
      text: 'Hope is being able to see that there is light despite all of the darkness.',
      author: 'Desmond Tutu',
      tags: ['darkness', 'hope', 'light'],
    },
    {
      text: 'Everything that is done in the world is done by hope.',
      author: 'Martin Luther',
      tags: ['hope'],
    },
    {
      text: 'Once you choose hope, anything’s possible.',
      author: 'Christopher Reeve',
      tags: ['hope', 'possibility'],
    },
  ],
  Humor: [
    {
      text: 'I am so clever that sometimes I don’t understand a single word of what I am saying.',
      author: 'Oscar Wilde, The Happy Prince and Other Stories',
      tags: ['cleverness', 'humor'],
    },
    {
      text: 'A day without sunshine is like, you know, night.',
      author: 'Steve Martin',
      tags: ['humor'],
    },
    {
      text: 'I’m not superstitious, but I am a little stitious.',
      author: 'Michael Scott',
      tags: ['humor'],
    },
  ],
};

// Stable pseudo "likes" count for a quote (so cards look like Goodreads without
// a backend). Deterministic from the text.
export function likeCount(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return 800 + (h % 49000);
}
