const defaultAuthorizedUserEmails = [
  "ashorangelake@gmail.com",
  "ocampojenis333@gmail.com",
];

const authorizedUserEmails = (
  process.env.AUTHORIZED_USER_EMAILS ?? defaultAuthorizedUserEmails.join(",")
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAuthorizedUserEmail(email: string): boolean {
  return authorizedUserEmails.includes(email.trim().toLowerCase());
}

export const unauthorizedUserMessage =
  "This email address is not authorized to access this site.";