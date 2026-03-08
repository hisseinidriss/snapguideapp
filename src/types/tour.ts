export type TourStep = {
  id: string;
  title: string;
  content: string;
  selector: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  order: number;
};

export type Tour = {
  id: string;
  name: string;
  appId: string;
  steps: TourStep[];
  createdAt: string;
  updatedAt: string;
};

export type App = {
  id: string;
  name: string;
  url: string;
  description: string;
  tours: Tour[];
  createdAt: string;
};
