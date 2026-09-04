const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('sign out is a separate account footer, outside identity and deletion menus',()=>{
 const source=read('work-gym-planner-v16/accounts-v18.js');
 const identity=source.slice(source.indexOf('<div class="accountIdentity">'),source.indexOf('<div class="accountMenu">'));
 assert.doesNotMatch(identity,/signOutAccount/);
 assert.match(source,/<\/details><\/div><footer class="accountSessionActionsV71" aria-label="Session actions"><button id="signOutAccount" type="button">Sign out<\/button><\/footer>/);
 assert.equal((source.match(/id="signOutAccount"/g)||[]).length,1);
 assert.ok(source.includes("$('#signOutAccount').onclick=signOut;"));
});

test('account footer has a full-width touch target and safely wraps long emails',()=>{
 const css=read('work-gym-planner-v16/app-v30.css');
 assert.match(css,/body\.premiumV30 #accountDialog \.accountSessionActionsV71 #signOutAccount\{[^}]*width:100%;min-height:48px/);
 assert.match(css,/body\.premiumV30 #accountDialog \.accountIdentity b\{overflow-wrap:anywhere\}/);
});
