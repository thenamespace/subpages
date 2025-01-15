export interface KnownText {
  key: string;
  label: string;
  type: "social" | "profile";
  placeholder?: string;
  disabled?: boolean;
}

export const KnownTexts: Record<string, KnownText> = {
  name: {
    key: "name",
    label: "Nickname",
    type: "profile",
    placeholder: "ex. John Wick",
  },
//   avatar: {
//     key: "avatar",
//     label: "Avatar",
//     type: "profile",
//     placeholder: "Your avatar url",
//   },
  url: {
    key: "url",
    label: "Website",
    type: "profile",
    placeholder: "ex. https://www.namespace.ninja",
  },
  description: {
    key: "description",
    label: "Short Bio",
    type: "profile",
    placeholder: "ex. I love Namespace!",
  },
  mail: {
    key: "mail",
    label: "Email",
    type: "profile",
    placeholder: "ex. me@...",
  },
  location: {
    key: "location",
    type: "profile",
    label: "Location",
    placeholder: "ex. Japan/Tokyo",
  },
  "com.twitter": {
    key: "com.twitter",
    type: "social",
    label: "Twitter",
    placeholder: "ex. johndoe",
  },
  "com.warpcast": {
    key: "com.warpcast",
    type: "social",
    label: "Warpcast",
    placeholder: "ex. johndoe",
  },
  "com.github": {
    key: "com.github",
    type: "social",
    label: "Github",
    placeholder: "ex. johndoe",
  },
  "com.discord": {
    key: "com.discord",
    type: "social",
    label: "Discord",
    placeholder: "ex. johndoe",
  },
  "org.telegram": {
    key: "org.telegram",
    type: "social",
    label: "Telegram",
    placeholder: "ex. @johndoe",
  },
  "com.youtube": {
    key: "com.youtube",
    type: "social",
    label: "Youtube",
    placeholder: "ex. @johndoe",
  },
};
