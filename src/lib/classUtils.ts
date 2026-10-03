export function getClassLifecycle(cls: any) {
  if (!cls) return 'SCHEDULED';
  if (cls.status === 'Cancelled') return 'CANCELLED';
  if (cls.status === 'Ended' || cls.status === 'Completed') return 'ENDED';

  const startTime = cls.startTime?.toDate 
    ? cls.startTime.toDate() 
    : (cls.startTime ? new Date(cls.startTime) : null);
  
  const durationMins = Number(cls.duration || cls.durationMinutes || 60);

  if (!startTime || isNaN(startTime.getTime())) {
    return cls.status || 'SCHEDULED';
  }

  const endTime = new Date(startTime.getTime() + durationMins * 60000);
  const now = new Date();

  if (now < startTime) {
    return 'SCHEDULED';
  } else if (now >= startTime && now < endTime) {
    const hasMeetUrl = Boolean(cls.meetingUrl || cls.googleMeetUrl);
    return hasMeetUrl ? 'LIVE' : 'SCHEDULED';
  } else {
    return 'ENDED';
  }
}

export function formatClassTime(cls: any) {
  const startTime = cls.startTime?.toDate ? cls.startTime.toDate() : (cls.startTime ? new Date(cls.startTime) : null);
  if (!startTime) return 'Schedule TBD';
  return startTime.toLocaleString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
