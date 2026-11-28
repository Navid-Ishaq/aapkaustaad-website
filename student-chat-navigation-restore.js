export const KEY='alnoor-chat-navigation-v2';
const safeNumber=(v,max=100000)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function saveNavigation(storage,user,state){if(!user)return;try{storage.setItem(KEY,JSON.stringify({user,admin:state.admin===true,classId:typeof state.classId==='string'?state.classId:null,scroll:safeNumber(state.scroll,10000000),studentPage:safeNumber(state.studentPage),teacherPage:safeNumber(state.teacherPage),cleanup:state.cleanup===true}));}catch{}}
export function readNavigation(storage,user){try{const s=JSON.parse(storage.getItem(KEY));if(s?.user===user&&user)return s;clearNavigation(storage);}catch{}return null;}
export function clearNavigation(storage){try{storage.removeItem(KEY);}catch{}}
