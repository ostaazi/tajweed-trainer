// Added highlightTargetWord for target word coloring
function renderQuestion(q) {
  const questionText = document.getElementById('questionText');
  questionText.innerHTML = highlightTargetWord(q.question, q.targetWord);
}
function highlightTargetWord(text, word) {
  if (!word) return text;
  const pattern = new RegExp(word, 'g');
  return text.replace(pattern, `<span class='target-word'>${word}</span>`);
}
