export {};

declare global {
  interface Window {
    neuralensDesktop?: {
      isDesktop: boolean;
      platform: string;
      setScreenShareState: (active: boolean, analyzing?: boolean) => void;
    };
  }
}
