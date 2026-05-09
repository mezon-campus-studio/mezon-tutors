type FakeMessage = {
  id: string;
  sender: "student" | "tutor";
  content: string;
};

type Translator = (key: string, values?: Record<string, string | number>) => string;

const MESSAGE_SENDERS: Array<"student" | "tutor" | "student"> = ["student", "tutor", "student"];
const TOTAL_FAKE_SETS = 10;

export function getRandomFakeSetIndex() {
  return Math.floor(Math.random() * TOTAL_FAKE_SETS);
}

export function buildFakeMessages(t: Translator, peerName: string, setIndex: number): FakeMessage[] {
  return MESSAGE_SENDERS.map((sender, messageIndex) => ({
    id: `fake-${setIndex}-${messageIndex}`,
    sender,
    content: t(`fakeSets.set${setIndex + 1}.${messageIndex}`, { peerName }),
  }));
}
