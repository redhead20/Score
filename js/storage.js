// Browser-local notes and last-read page; browser storage is not a backup.
export const documentKey=file=>`swipe:${file.name}:${file.size}:${file.lastModified}`;
export function readJSON(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}}
export function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){console.warn('Local storage unavailable:',e);return false}}
