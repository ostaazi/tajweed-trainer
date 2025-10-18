// Added automatic option extraction from question text if empty
QUESTIONS.forEach(q => {
  if (!q.options || q.options.length === 0) {
    const matches = q.question.match(/إظهار|إدغام(?: بغنة| بغير غنة)?|إخفاء|إقلاب|مد طبيعي|مد متصل|مد منفصل|مد لازم/g);
    if (matches) q.options = [...new Set(matches)];
  }
});
