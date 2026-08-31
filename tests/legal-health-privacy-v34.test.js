const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function internalAnchors(html){
  return[...html.matchAll(/href="#([^"]+)"/g)].map(match=>match[1]);
}

test('privacy policy identifies the operator and gives a private rights channel',()=>{
  const privacy=read('work-gym-planner/privacy.html');
  assert.match(privacy,/Privacy &amp; Consumer Health Data Policy/);
  assert.match(privacy,/Effective:<\/strong> August 31, 2026/);
  assert.match(privacy,/Bibinii Farms Company Ltd/);
  assert.match(privacy,/Accra, Ghana/);
  assert.match(privacy,/info@bibiniifarms\.com/);
  assert.match(privacy,/Work \+ Workout Privacy Request/);
  assert.match(privacy,/You do not need to create a new account/);
  assert.doesNotMatch(privacy,/\b(?:TBD|TODO|PLACEHOLDER)\b|\[[A-Z _-]{3,}\]/);
  for(const id of internalAnchors(privacy))assert.match(privacy,new RegExp(`id="${id}"`),`missing privacy section #${id}`);
});

test('privacy policy covers health categories, purposes, sources, disclosures and rights',()=>{
  const privacy=read('work-gym-planner/privacy.html');
  for(const disclosure of [
    'Fitness and activity','Nutrition and food','Body and recovery','Sources of data',
    'Consumer health data notice','Health-data disclosures','Your health-data rights',
    'withdraw consent','request deletion','separate valid authorization','geofencing'
  ])assert.match(privacy,new RegExp(disclosure,'i'),disclosure);
  for(const provider of ['Supabase','Vercel','OpenAI','Open Food Facts','Google','Microsoft','WebDAV'])
    assert.match(privacy,new RegExp(provider,'i'),provider);
  assert.match(privacy,/do not sell or rent personal data or consumer health data/i);
  assert.match(privacy,/do not share personal data for cross-context behavioral advertising/i);
  assert.match(privacy,/not a HIPAA service/i);
  assert.match(privacy,/breach-notification laws/i);
});

test('privacy policy accurately describes optional sensitive-data features and deletion',()=>{
  const privacy=read('work-gym-planner/privacy.html');
  assert.match(privacy,/Requests are sent with API storage disabled/);
  assert.match(privacy,/saves the text “\[equipment photo\]”/);
  assert.match(privacy,/matched row believed to be yours and relevant date headers, not the full roster/);
  assert.match(privacy,/Apple Health export or CSV files are parsed on your device/);
  assert.match(privacy,/encrypted access\/refresh tokens/);
  assert.match(privacy,/client-error endpoint sends only an error source, broad category and app release/);
  assert.match(privacy,/Permanent account deletion removes the authentication user and associated cloud rows through database cascade/);
  assert.match(privacy,/backups, calendar events, screenshots or files you saved or shared are outside our control/i);
});

test('privacy policy includes EEA and UK health-data rules and transfer safeguards',()=>{
  const privacy=read('work-gym-planner/privacy.html');
  for(const disclosure of [
    'European Economic Area','UK GDPR','Article 6','explicit consent',
    'one month','Standard Contractual Clauses','UK International Data Transfer Agreement',
    'UK Addendum','Information Commissioner’s Office','supervisory authorities',
    'decision based solely on automated processing','Article 27'
  ])assert.match(privacy,new RegExp(disclosure,'i'),disclosure);
  assert.match(privacy,/Article 9\(2\)\(a\)/i);
  assert.match(privacy,/policy itself is not consent/i);
  assert.match(privacy,/judicial remedy/i);
});

test('privacy policy offers a global baseline and names major regional frameworks',()=>{
  const privacy=read('work-gym-planner/privacy.html');
  for(const disclosure of [
    'Global baseline','Switzerland','United States','Washington’s My Health My Data Act',
    'Canada','PIPEDA','Brazil','LGPD','ANPD','Australia','Australian Privacy Principles',
    'New Zealand','Privacy Act 2020','South Africa','POPIA','Singapore','PDPA','Japan','APPI',
    'Other locations','non-waivable local privacy'
  ])assert.match(privacy,new RegExp(disclosure,'i'),disclosure);
});

test('terms include a complete consumer wellness and app-store framework',()=>{
  const terms=read('work-gym-planner/terms.html');
  for(const term of [
    'Bibinii Farms Company Ltd','at least 18','Limited license and ownership','Your content and feedback',
    'not a medical device','Exercise, nutrition and schedule safety','AI-generated features',
    'Paid features, subscriptions and refunds','Acceptable use','Suspension, termination and changes',
    'Limitation of liability and indemnity','laws of Ghana','Apple and Google app-store terms',
    'mandatory consumer rights'
  ])assert.match(terms,new RegExp(term,'i'),term);
  assert.match(terms,/US\$100/);
  assert.match(terms,/Alternative Dispute Resolution Act, 2010 \(Act 798\)/);
  assert.match(terms,/14-day cooling-off or withdrawal right/i);
  assert.match(terms,/EEA, UK and Switzerland/);
  assert.match(terms,/courts where you live where applicable/i);
  assert.match(terms,/Australian Consumer Law/);
  assert.match(terms,/We do not require individual arbitration or a class-action waiver/);
  assert.doesNotMatch(terms,/\b(?:TBD|TODO|PLACEHOLDER)\b|\[[A-Z _-]{3,}\]/);
  for(const id of internalAnchors(terms))assert.match(terms,new RegExp(`id="${id}"`),`missing terms section #${id}`);
});

test('support keeps health requests private while preserving public bug reporting',()=>{
  const support=read('work-gym-planner/support.html');
  assert.match(support,/Privacy or health-data request/);
  assert.match(support,/Use private email—not the public issue tracker/);
  assert.match(support,/info@bibiniifarms\.com/);
  assert.match(support,/do not send your password, full health export or unnecessary medical details/i);
  assert.match(support,/github\.com\/nanaking1fk-cyber\/freshnest-app\/issues/);
});

test('health privacy is prominent and legal pages remain in production and native bundles',()=>{
  const landing=read('work-gym-planner-v16/landing-v29.js');
  const menu=read('work-gym-planner-v16/commercial-legal-v17.js');
  const commercial=read('work-gym-planner-v16/commercial-v17.js');
  const workspace=read('work-gym-planner-v16/app-v30.js');
  const build=read('app-store/scripts/build-web.mjs');
  const sw=read('work-gym-planner/sw.js');
  assert.match(landing,/Privacy &amp; health data/);
  assert.match(landing,/pageUrl\('privacy\.html'\)/);
  assert.match(landing,/pageUrl\('terms\.html'\)/);
  assert.doesNotMatch(landing,/href="\.\/privacy\.html"/);
  assert.match(menu,/Health data, account sync, providers, rights and deletion/);
  assert.match(menu,/Privacy & Consumer Health Data Policy/);
  assert.match(menu,/new URL\(`\.\/\$\{file\}`,location\.href\)/);
  assert.doesNotMatch(menu,/\/freshnest-app\/work-gym-planner/);
  assert.doesNotMatch(commercial,/location\.href='\/freshnest-app\/work-gym-planner/);
  assert.match(workspace,/title:'Legal & privacy'/);
  assert.match(workspace,/privacy & consumer health data policy/);
  assert.match(workspace,/v30LegalShown/);
  assert.match(build,/const legal=\['privacy\.html','support\.html','terms\.html','delete-account\.html'\]/);
  assert.match(sw,/\.\/shell\.html/);
  assert.match(sw,/\.\.\/shared\/observability\.js/);
  assert.match(sw,/\.\.\/work-gym-planner-v16\/app-v30\.js/);
  assert.match(sw,/\.\.\/work-gym-planner-v15\/index\.html/);
});
