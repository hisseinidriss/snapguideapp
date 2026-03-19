export const generateAppHue = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  let hue = Math.abs(hash) % 300;
  if (hue >= 280) hue += 60;
  return hue;
};

export const generateAppColor = (name: string): string => {
  return `hsl(${generateAppHue(name)}, 45%, 90%)`;
};

export const generateAppAccent = (name: string): string => {
  return `hsl(${generateAppHue(name)}, 50%, 45%)`;
};
