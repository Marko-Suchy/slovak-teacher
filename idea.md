## IDEA

An interavtive Slovak teacher, filled with A1 stories. It's a tool, similar to lenguia, so that I can practice language for ~10 minutes every night.

For now, it's focused on Slovak at the A1 level - because that's where I am.

Data:
* ~100 A1 level short stories (~200 - 500 words) like those in "Slovak Short Stories for beginers (A1): 100 Easy Stories: Learn Slovak"
    * Slovak text
    * English translated text

Features:
* You click a story, and open it up in a kind of text editor with 3 panes. (One full length pane on the left, and a split pane on thright.) 
    * The Left-most pane is where you scroll through the Slovak text.
    * The top right pane is an inspector, for highlighted text. When you highlight a word or sentance on the left, it shows a translation of it on the right. This pane also has a little speaker icon, so that if you want to hear the princunciation. When only a single word is highlighted, it should should the inifinitive version of the word, and the various forms/conjugations of that word.
    * The Bottom right window is an instance of ChatGPT. It's there so that questions about grammar etc.. Importantly, this instance optionally uses a voice model, which can allow one to talk in slovak. The Instance is armed with the context of the story. The instance primarily speaks in slovak, but may give some help in english.

* Highlighted words can be turned into flashcards


* After Each story, there are some questions about the text.
    * Questions can be answered by filling in a multiple choice, OR by a voice conversation with the agent.


* Stories emphasize important vocab words for A1 and A2 level speakers. 

Design:
* Overall, this should be fairly lightweight and simple. The stories should exist in some Data source, so that they are not generated new every time.
* Assume that a OpenAI key will be given fot the AI powered features of this project. 
* Idk... take liberties to design this will. 
