(()=>{
try{sessionStorage.setItem('radarAdmin','public-mode')}catch(_){ }
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('adminBtn')?.remove();
  document.getElementById('adminDialog')?.setAttribute('aria-hidden','true');
  const actions=document.querySelector('.top-actions');
  if(actions&&!actions.querySelector('.public-edit-note')){
    const note=document.createElement('span');
    note.className='public-edit-note';
    note.textContent='edição direta';
    actions.appendChild(note);
  }
});
})();