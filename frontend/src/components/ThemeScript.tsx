/** Put inside <head> of BOTH root layouts. Applies the saved theme before first paint (no flash)
 *  and keeps every window (laptop intro + its /app iframe) in sync through the storage event. */
export function ThemeScript() {
  const code = `(function(){var d=document.documentElement,k='sp-theme';function ok(v){return v==='light'||v==='dark'}
try{var t=localStorage.getItem(k);d.setAttribute('data-theme',ok(t)?t:'dark')}catch(e){d.setAttribute('data-theme','dark')}
addEventListener('storage',function(e){if(e.key===k&&ok(e.newValue))d.setAttribute('data-theme',e.newValue)})})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
