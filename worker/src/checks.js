export const SECURITY_CHECKS = [
  { id: 'https', question: 'Does the website load over HTTPS with a valid certificate?', severity: 'High', remediation: 'Enable HTTPS with a valid certificate and redirect HTTP traffic to HTTPS.' },
  { id: 'headers', question: 'Are security headers present (nosniff, frame protection, content policy)?', severity: 'Medium', remediation: 'Add nosniff, frame-ancestors and a content security policy at the hosting or Cloudflare layer.' },
  { id: 'exposed', question: 'Are admin, backup and environment files blocked from public access?', severity: 'High', remediation: 'Block public access to admin panels, backups, environment files and version-control paths.' },
  { id: 'updates', question: 'Is the website platform and its plugins kept up to date?', severity: 'High', remediation: 'Update the platform and plugins, and remove unused extensions.' },
  { id: 'forms', question: 'Do contact and login forms use spam and abuse protection?', severity: 'Medium', remediation: 'Add captcha or rate limiting to public forms and login pages.' },
  { id: 'privacy', question: 'Does the website publish a privacy policy and contact information?', severity: 'Low', remediation: 'Publish a privacy policy and a working contact page.' },
  { id: 'backups', question: 'Are regular backups taken and tested?', severity: 'Medium', remediation: 'Schedule regular backups and test a restore at least once.' },
  { id: 'accounts', question: 'Do admin accounts use strong passwords and two-factor sign-in?', severity: 'High', remediation: 'Enforce strong passwords and two-factor sign-in for every admin account.' },
];

export function securityFindings(answers) {
  const safe = answers && typeof answers === 'object' ? answers : {};
  return SECURITY_CHECKS.filter((c) => safe[c.id] === 'no');
}

export function securityScore(answers) {
  const safe = answers && typeof answers === 'object' ? answers : {};
  const answered = SECURITY_CHECKS.filter((c) => safe[c.id] === 'yes' || safe[c.id] === 'no');
  if (answered.length === 0) return null;
  const yes = answered.filter((c) => safe[c.id] === 'yes').length;
  return Math.round((yes / answered.length) * 100);
}
