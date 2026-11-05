/**
 * Google Tag Manager container for Care24Japan. Public by design (it ships
 * in every page's HTML), so it lives in code rather than env.
 */
export const GTM_ID = "GTM-PTN858QJ";

/**
 * Staff exclusion. Opening any page with `?staff=1` flags this browser for a
 * year (cookie + localStorage); flagged browsers never load GTM, so internal
 * visits stay out of analytics.
 */
export const STAFF_FLAG = "c24_staff";

export function gtmSnippet(id: string): string {
  return `(function(w,d,s,l,i){try{var q=new URLSearchParams(w.location.search);if(q.get('staff')==='1'){d.cookie='${STAFF_FLAG}=1; max-age=31536000; path=/; SameSite=Lax'+(w.location.protocol==='https:'?'; Secure':'');try{w.localStorage.setItem('${STAFF_FLAG}','1')}catch(e){}}var f1=/(?:^|; )${STAFF_FLAG}=1(?:;|$)/.test(d.cookie);var f2=false;try{f2=w.localStorage.getItem('${STAFF_FLAG}')==='1'}catch(e){}if(f1||f2)return}catch(e){}w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`;
}
