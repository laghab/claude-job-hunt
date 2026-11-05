// Runs fixed form questions through the answer functions of the apply scripts.
// node tests/answers_test.js > out.json   (diff against a saved baseline)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(root, 'answers.md'), 'utf8');
const m = md.match(/^## Form values[\s\S]*?```json\n([\s\S]*?)\n```/m);
const A = m ? m[1] : '{}';
function extract(file, fnName) {
  let src = fs.readFileSync(path.join(root, 'scripts', file), 'utf8').replace('/*ANSWERS*/{}', A);
  const body = src.slice(src.indexOf('=>', src.indexOf('async (page')) + 2);
  const pre = body.slice(body.indexOf('{') + 1, body.indexOf('const res = [];'));
  return new Function('page', 'ARGS', pre + `\nreturn ${fnName};`)({setDefaultTimeout() {}}, {});
}
const li = extract('linkedin_apply.js', 'ans'), hi = extract('hirist_apply.js', 'ans'), nk = extract('naukri_apply.js', 'answer');
const yn = ['Yes', 'No'];
const out = {linkedin: {}, hirist: {}, naukri: {}};
const L = [
  ['Mobile phone number', 'text', [], {}], ['Email address', 'select', [], {}], ['Phone country code', 'select', ['India (+91)', 'Iran (+98)'], {}],
  ['What is your current location (city)?', 'text', [], {}], ['LinkedIn Profile URL', 'text', [], {}], ['GitHub profile link', 'text', [], {}],
  ['Portfolio website', 'text', [], {}], ['What is your expected CTC (in LPA)?', 'text', [], {loc: 'Gurugram, Haryana'}],
  ['Expected annual salary (INR)', 'number', [], {loc: 'Bengaluru'}], ['Desired salary in USD per month', 'text', [], {abroad: true, loc: 'Remote'}],
  ['Current CTC', 'text', [], {}], ['What is your notice period?', 'select', ['Immediate', '30 days'], {}],
  ['How many years of experience do you have with Linux?', 'number', [], {}], ['How many years of work experience do you have with Jenkins?', 'number', [], {}],
  ['How many years of work experience do you have with AWS?', 'number', [], {}], ['How many years of experience do you currently have?', 'number', [], {}],
  ['Do you have experience with Docker?', 'radio', yn, {}], ['Do you have experience with Azure?', 'radio', yn, {}], ['Gender', 'select', ['Male', 'Female'], {}],
  ['Are you legally authorized to work in India?', 'radio', yn, {}], ['Will you require visa sponsorship?', 'radio', yn, {abroad: true}],
  ['Have you worked on CI/CD pipelines, automated deployments, or infrastructure provisioning workflows?', 'radio', yn, {}],
  ['Are you based in UAE?', 'radio', yn, {}], ['Are you currently based in India?', 'radio', yn, {}],
  ['Have you worked with SAP before?', 'radio', yn, {}], ['Are you an Indian National?', 'radio', yn, {}],
  ['Are you willing to work in 17,000 AED?', 'radio', yn, {}], ['Are you okay with 9000 AED per month?', 'radio', yn, {}],
];
for (const q of L) out.linkedin[q[0] + (q[3].loc ? ' @' + q[3].loc : '')] = li(...q);
const H = [['What is your current CTC?', 'Bengaluru'], ['Expected CTC?', 'Noida'], ['Expected CTC?', 'Pune'], ['What is your notice period?', ''], ['Are you willing to relocate?', ''],
  ['Where are you currently located?', 'Remote'], ['Where are you currently located?', 'Pune'], ['How many years of experience with Linux?', ''], ['Total experience?', ''],
  ['How many years of experience in Jenkins?', ''], ['Years of experience in Kafka?', ''], ['Which cloud platform have you used?', ''], ['Can you join immediately?', ''],
  ['Why should we hire you?', ''], ['LinkedIn profile URL', ''], ['GitHub link', ''], ['Portfolio website link', '']];
for (const [q, loc] of H) out.hirist[q + ' @' + loc] = hi(q, loc);
const N = [['What is your current CTC?', []], ['Notice period', ['Immediate', '30 days']], ['Current location', []], ['Pincode', []], ['Date of birth', []],
  ['How many years of experience do you have in Linux?', []], ['How many years of experience do you have in Jenkins?', []], ['How many years of experience do you have in Kafka?', []],
  ['Total years of experience', []], ['Do you have experience with Kubernetes?', yn], ['Do you have experience with Java?', yn], ['Preferred location', ['Remote', 'Mumbai']]];
for (const [q, o] of N) out.naukri[q] = nk(q, o);
console.log(JSON.stringify(out, null, 1));
