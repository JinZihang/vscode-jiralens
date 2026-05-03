export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function getRelativeTimePassed(curr: number, prev: number): string {
  const minuteMs = 60 * 1000;
  const hourMs = minuteMs * 60;
  const dayMs = hourMs * 24;
  const monthMs = dayMs * 30;
  const yearMs = dayMs * 365;
  const elapsedTime = curr - prev;
  let elapsedTimeValue = 0;
  let timeUnit = '';
  if (elapsedTime < minuteMs) {
    elapsedTimeValue = Math.round(elapsedTime / 1000);
    timeUnit = 'second';
  } else if (elapsedTime < hourMs) {
    elapsedTimeValue = Math.round(elapsedTime / minuteMs);
    timeUnit = 'minute';
  } else if (elapsedTime < dayMs) {
    elapsedTimeValue = Math.round(elapsedTime / hourMs);
    timeUnit = 'hour';
  } else if (elapsedTime < monthMs) {
    elapsedTimeValue = Math.round(elapsedTime / dayMs);
    timeUnit = 'day';
  } else if (elapsedTime < yearMs) {
    elapsedTimeValue = Math.round(elapsedTime / monthMs);
    timeUnit = 'month';
  } else {
    elapsedTimeValue = Math.round(elapsedTime / yearMs);
    timeUnit = 'year';
  }
  const plural = elapsedTimeValue > 1 ? 's' : '';
  return `${elapsedTimeValue} ${timeUnit}${plural} ago`;
}

export function truncateMessage(message: string, lengthLimit = 30): string {
  if (message.length < lengthLimit) {
    return message;
  }
  const words = message.split(' ');
  let truncatedMessage = '';
  let wordIndex = 0;
  while (truncatedMessage.length + words[wordIndex].length < lengthLimit) {
    truncatedMessage += `${words[wordIndex]} `;
    wordIndex++;
  }
  return `${truncatedMessage.trim()}...`;
}

export function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, ms);
  };
}

export function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
