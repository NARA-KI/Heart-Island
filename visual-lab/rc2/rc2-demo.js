document.querySelectorAll('.rc2-option').forEach((option) => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.rc2-option').forEach((item) => item.classList.remove('is-selected'));
    option.classList.add('is-selected');
  });
});
