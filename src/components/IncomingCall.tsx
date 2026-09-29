import React from 'react';
import { IncomingCallDialog } from './IncomingCallDialog';
import { ActiveCallSession } from '../types';

export interface IncomingCallProps {
  session: ActiveCallSession;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * IncomingCall Component
 * Keeps incoming call ringing until accepted or rejected.
 * Does NOT call zg.joinRoom() on component mount.
 * Only calls joinRoom() and starts timer inside handleAccept() function after user clicks Accept.
 */
export const IncomingCall: React.FC<IncomingCallProps> = (props) => {
  return <IncomingCallDialog {...props} />;
};

export default IncomingCall;
