import mitt from "mitt";

export const eventBus = mitt();
export const messageQueue: string[] = [];
