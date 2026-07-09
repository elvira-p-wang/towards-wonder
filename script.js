const notes = {
  Sydney: {
    title: 'Sydney',
    text: 'Where I learned that independence can be both lonely and beautiful.'
  },
  Luxembourg: {
    title: 'Luxembourg',
    text: 'A small country that made me curious about language, identity, and European childhoods.'
  },
  Derbyshire: {
    title: 'Derbyshire',
    text: 'A place where literature, landscape, and imagination meet — hello, Mr Darcy.'
  },
  Denmark: {
    title: 'Denmark',
    text: 'A quiet note on design, distance, and the art of seeming independent.'
  }
};

const mapNote = document.getElementById('mapNote');
document.querySelectorAll('.pin').forEach(pin => {
  pin.addEventListener('click', () => {
    const place = pin.dataset.place;
    mapNote.innerHTML = `
      <h3>${notes[place].title}</h3>
      <p>${notes[place].text}</p>
      <a href="#" class="text-link">Read travel note →</a>
    `;
  });
});
