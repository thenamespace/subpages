import theme from "../../theme.json";
import boeBg from "../assets/boe-bg.png";


export const themeVariables = {
  ...theme,
  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${boeBg}')`,
};



export const hexToRgba = (hex: string, alpha: any) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};