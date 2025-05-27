import { GeneratedAct } from "./types/vn";

// Sample scene data in the new simplified format
export const testSceneData: GeneratedAct = {
  "scene1": {
    "name": "Act 1 Scene 1",
    "setting": "A cozy café in downtown on a rainy afternoon",
    "setting_description": "A warm, inviting café with large windows showing rain outside, soft lighting, wooden tables, and shelves of books along one wall",
    "dialogue": [
      ["Narrator", "The rain taps against the window as you sip your coffee, watching people hurry by with their umbrellas."],
      ["Alex", "Mind if I join you? All the other tables are taken."],
      ["You", "Please, go ahead."],
      ["Alex", "Thanks. I'm Alex, by the way. I come here often but haven't seen you before."],
      ["You", "I just moved to the area. I'm trying to get familiar with the neighborhood."],
      ["Alex", "Well, you picked a good spot. This café has the best pastries in town. I highly recommend the almond croissant."],
      ["Narrator", "A comfortable silence falls between you as Alex opens a leather-bound journal."],
      ["Alex", "So what brings you to this part of the city?"],
    ],
    "choices": [
      {
        "text": "I'm a writer looking for inspiration",
        "description": "Share your creative pursuits",
        "delta": {"Alex": 2},
        "next": "scene2"
      },
      {
        "text": "I'm starting a new job nearby",
        "description": "Talk about your professional life",
        "delta": {"Alex": 1},
        "next": "scene3"
      },
      {
        "text": "Just exploring - I like to wander",
        "description": "Be mysterious about your reasons",
        "delta": {"Alex": 0},
        "next": "scene4"
      }
    ]
  },
  "scene2": {
    "name": "Act 1 Scene 2",
    "setting": "The same café, but you've moved to a quieter corner table",
    "dialogue": [
      ["Alex", "A writer! That's fascinating. What do you write?"],
      ["You", "I'm working on a novel about people whose lives intersect in unexpected ways."],
      ["Alex", "That sounds intriguing. I'm something of a writer myself, though just for fun. Mostly poetry."],
      ["Narrator", "Alex shows you some entries in the journal - beautifully crafted poems about city life."],
      ["Alex", "Maybe we could meet up again sometime? I know some great writing spots in the city."],
      ["Narrator", "There's a hopeful look in Alex's eyes as they wait for your response."],
    ],
    "choices": [
      {
        "text": "I'd love that - let's exchange numbers",
        "delta": {"Alex": 3},
        "next": "scene5"
      },
      {
        "text": "Perhaps. I'm pretty busy with my writing though",
        "delta": {"Alex": -1},
        "next": "scene6"
      }
    ]
  },
  "scene3": {
    "name": "Act 1 Scene 3",
    "setting": "The café, as rain continues to pour outside",
    "dialogue": [
      ["Alex", "New job? What field are you in?"],
      ["You", "I just started at the tech firm on 5th Street. I'm in software development."],
      ["Alex", "No way! I work just across from there, at the design agency. We probably passed each other on the street."],
      ["Narrator", "Alex laughs at the coincidence, seeming genuinely pleased."],
      ["Alex", "We should grab lunch sometime. There's a great sandwich place halfway between our offices."],
    ],
    "choices": [
      {
        "text": "That sounds great, let's do it",
        "delta": {"Alex": 2},
        "next": "scene5"
      },
      {
        "text": "Maybe. I like to keep work and social life separate",
        "delta": {"Alex": -1},
        "next": "scene6"
      }
    ]
  },
  "scene4": {
    "name": "Act 1 Scene 4",
    "setting": "The café, with the rain now turning into a heavy downpour",
    "dialogue": [
      ["Alex", "A wanderer, huh? I can respect that. Sometimes getting lost is the best way to find something interesting."],
      ["You", "Exactly. You never know what might be around the next corner."],
      ["Alex", "Or who you might meet in a café on a rainy day."],
      ["Narrator", "Alex gives you a meaningful smile."],
      ["Alex", "I know some off-the-beaten-path places around here if you're interested in exploring further."],
    ],
    "choices": [
      {
        "text": "I'd appreciate a local guide",
        "delta": {"Alex": 2},
        "next": "scene5"
      },
      {
        "text": "I prefer to discover things on my own",
        "delta": {"Alex": -1},
        "next": "scene6"
      }
    ]
  },
  "scene5": {
    "name": "Act 1 Scene 5",
    "setting": "Outside the café, under the shelter of the awning",
    "setting_description": "The entrance of a café with a striped awning, rain pouring down around it, two people standing close together watching the rain, city street visible beyond",
    "dialogue": [
      ["Narrator", "The rain has slowed to a gentle drizzle as you and Alex prepare to leave."],
      ["Alex", "I'm really glad we met today."],
      ["You", "Me too. It's nice to make a connection so quickly in a new place."],
      ["Alex", "Here's my number. Don't be a stranger, okay?"],
      ["Narrator", "As Alex hands you a slip of paper with their phone number, your fingers touch briefly."],
      ["Alex", "Until next time."],
      ["Narrator", "With a warm smile and a wave, Alex heads off down the wet sidewalk, occasionally glancing back at you."],
      ["Narrator", "You have the feeling this is the beginning of something interesting."],
    ],
    "choices": null
  },
  "scene6": {
    "name": "Act 1 Scene 6",
    "setting": "Outside the café, as the rain tapers off",
    "setting_description": "The front of a café with rain-slicked streets, the sky beginning to clear, two people standing at a distance from each other in front of the café",
    "dialogue": [
      ["Narrator", "The rain has almost stopped as you prepare to leave."],
      ["Alex", "Well, it was nice meeting you."],
      ["You", "Likewise. Thanks for the company."],
      ["Alex", "Sure. Maybe I'll see you around sometime."],
      ["Narrator", "There's a hint of disappointment in Alex's voice."],
      ["Alex", "Take care."],
      ["Narrator", "Alex gives a polite nod before walking away, soon disappearing among the crowd of pedestrians."],
      ["Narrator", "You're left wondering if you made the right choice."],
    ],
    "choices": null
  }
};
