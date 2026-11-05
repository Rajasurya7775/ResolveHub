import { ShiftInfo, ShiftType } from '../types/user';

/**
 * Identifies current operational shift (Shift A, Shift B, or Shift C)
 */
export function getCurrentShift(date: Date = new Date()): ShiftInfo {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 6:15 AM = 375 minutes, 2:15 PM = 855 minutes, 10:15 PM = 1335 minutes
  const shiftAStart = 6 * 60 + 15;
  const shiftBStart = 14 * 60 + 15;
  const shiftCStart = 22 * 60 + 15;

  let shift: ShiftType;
  let description: string;

  if (totalMinutes >= shiftAStart && totalMinutes < shiftBStart) {
    shift = 'Shift A';
    description = 'Shift A Active';
  } else if (totalMinutes >= shiftBStart && totalMinutes < shiftCStart) {
    shift = 'Shift B';
    description = 'Shift B Active';
  } else {
    shift = 'Shift C';
    description = 'Shift C Active';
  }

  return { shift, description };
}
