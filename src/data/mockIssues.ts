import { Issue, DiscussionMessage } from '../types/issue';

export const INITIAL_ISSUES: Issue[] = [
  {
    id: 'ISS-1001',
    projectId: 'Nokia Production Dashboard',
    title: 'Real-time telemetry feed latency exceeding SLA threshold',
    shortDescription: 'Telemetry packet latency spiked over 1200ms on Node 4B cluster.',
    description: 'During peak manufacturing shift, the real-time telemetry stream on Node 4B dashboard began showing stale counters. Latency spiked from normal 45ms to over 1200ms, causing synchronization delay with line sensors.',
    issueType: 'Production Issue',
    occurrenceTime: '2026-11-03 08:30 AM',
    shift: 'Shift A',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-11-03',
    acceptedDeveloper: 'Unassigned',
    status: 'Open',
    isEligibleForDelete: true
  },
  {
    id: 'ISS-1002',
    projectId: 'Manufacturing Analytics',
    title: 'Yield breakdown chart throwing rendering exception',
    shortDescription: 'WebGL canvas context error when filtering by Q3 yield metrics.',
    description: 'When switching to Q3 date range on the Yield Breakdown widget, the browser throws an unhandled canvas context lost error. The entire analytics grid freezes and requires a hard page refresh.',
    issueType: 'Dashboard Issue',
    occurrenceTime: '2026-11-02 11:15 AM',
    shift: 'Shift A',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-11-02',
    acceptedDeveloper: 'Arun',
    acceptedDeveloperId: 'EMP205',
    acceptedDate: '2026-11-02 01:20 PM',
    status: 'Accepted',
    isEligibleForDelete: false
  },
  {
    id: 'ISS-1003',
    projectId: 'Network Monitoring',
    title: 'Switch SFP+ port 10 flap causing intermittent packet drops',
    shortDescription: 'Core fiber switch port experiencing 15 flaps per hour.',
    description: 'Switch SW-CORE-02 port 10 connecting to the SCADA gateway is flapping intermittently. CRC error counters are steadily incrementing, leading to dropped telemetry packets.',
    issueType: 'Network Issue',
    occurrenceTime: '2026-11-02 03:45 PM',
    shift: 'Shift B',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-11-02',
    acceptedDeveloper: 'Kumar',
    acceptedDeveloperId: 'EMP206',
    acceptedDate: '2026-11-02 04:10 PM',
    status: 'In Progress',
    isEligibleForDelete: false
  },
  {
    id: 'ISS-1004',
    projectId: 'Inventory Monitoring',
    title: 'Automated warehouse barcode scanner timeout on bay 7',
    shortDescription: 'Serial comm buffer overflow leading to scanner halt.',
    description: 'Fixed mount barcode scanners at Conveyor Bay 7 stop sending ACK packets after 300 pallet scans. Power cycle temporarily restores communication.',
    issueType: 'Hardware Issue',
    occurrenceTime: '2026-10-31 09:20 AM',
    shift: 'Shift A',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-10-31',
    acceptedDeveloper: 'Arun',
    acceptedDeveloperId: 'EMP205',
    acceptedDate: '2026-10-31 10:00 AM',
    status: 'Resolved',
    rca: 'Firmware buffer overflow caused by high-density Datamatrix symbology. Updated scanner firmware to v4.12.8 with enlarged serial FIFO ring buffer and tuned parity check.',
    resolvedDate: '2026-10-31 04:30 PM',
    isEligibleForDelete: false
  },
  {
    id: 'ISS-1005',
    projectId: 'Nokia Production Dashboard',
    title: 'OEE metric calculation discrepancy between Shift A and Shift B',
    shortDescription: 'Scheduled downtime exclusion formula had an offset bug.',
    description: 'Shift B reported an anomalous 18% drop in overall equipment effectiveness despite zero unscheduled line stops. Inspection revealed break duration was double-deducted.',
    issueType: 'Application Issue',
    occurrenceTime: '2026-10-28 02:40 PM',
    shift: 'Shift B',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-10-28',
    acceptedDeveloper: 'Kumar',
    acceptedDeveloperId: 'EMP206',
    acceptedDate: '2026-10-28 03:15 PM',
    status: 'Resolved',
    rca: 'Timezone aggregation bug in the scheduled maintenance offset function where local UTC+5:30 shift boundaries were parsed as UTC timestamps.',
    resolvedDate: '2026-10-29 11:45 AM',
    isEligibleForDelete: false
  },
  {
    id: 'ISS-1006',
    projectId: 'Manufacturing Analytics',
    title: 'High memory consumption in background report generation worker',
    shortDescription: 'Worker pool OOM killer triggered during large CSV exports.',
    description: 'Generating custom 30-day cross-shift audit reports triggers node memory pressure and container restarts on the analytics export service.',
    issueType: 'Other',
    occurrenceTime: '2026-11-01 11:20 PM',
    shift: 'Shift C',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-11-01',
    acceptedDeveloper: 'Unassigned',
    status: 'Open',
    isEligibleForDelete: true
  },
  {
    id: 'ISS-1007',
    projectId: 'Inventory Monitoring',
    title: 'ERP pallet stock reconciliation discrepancy',
    shortDescription: 'Automated batch sync missed pending transfer orders.',
    description: 'Reported for tracking stock sync differences between shop floor staging and central warehouse.',
    issueType: 'Application Issue',
    occurrenceTime: '2026-11-02 01:10 AM',
    shift: 'Shift C',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-11-02',
    acceptedDeveloper: 'Arun',
    acceptedDeveloperId: 'EMP205',
    status: 'In Progress',
    isEligibleForDelete: false
  },
  {
    id: 'ISS-1008',
    projectId: 'Network Monitoring',
    title: 'Subnet gateway router packet queue saturation',
    shortDescription: 'Ingress traffic on VLAN 20 exceeded policing limit.',
    description: 'Subnet gateway experienced buffer exhaustion during batch telemetry transmission from assembly bay 3.',
    issueType: 'Network Issue',
    occurrenceTime: '2026-10-29 07:30 PM',
    shift: 'Shift B',
    reportedBy: 'Surya',
    reportedById: 'EMP101',
    reportedDate: '2026-10-29',
    acceptedDeveloper: 'Kumar',
    acceptedDeveloperId: 'EMP206',
    acceptedDate: '2026-10-29 08:00 PM',
    status: 'Resolved',
    rca: 'Adjusted QoS priority queue weights for telemetry packets and increased policing burst ceiling on VLAN 20.',
    resolvedDate: '2026-10-30 01:15 AM',
    isEligibleForDelete: false
  }
];

export const INITIAL_DISCUSSIONS: Record<string, DiscussionMessage[]> = {
  'ISS-1001': [
    {
      id: 'msg-1',
      issueId: 'ISS-1001',
      senderId: 'EMP101',
      senderName: 'Surya',
      senderRole: 'Supporter',
      message: 'Hi team, Node 4B dashboard latency spiked significantly right after the 08:00 AM shift handover. Operators are noticing a 2-second visual lag on the assembly line screen.',
      timestamp: '2026-11-03 08:35 AM'
    }
  ],
  'ISS-1002': [
    {
      id: 'msg-2',
      issueId: 'ISS-1002',
      senderId: 'EMP101',
      senderName: 'Surya',
      senderRole: 'Supporter',
      message: 'Observed this specifically when selecting date filters older than 60 days on Chrome 124.',
      timestamp: '2026-11-02 11:20 AM'
    },
    {
      id: 'msg-3',
      issueId: 'ISS-1002',
      senderId: 'EMP205',
      senderName: 'Arun',
      senderRole: 'Developer',
      message: 'I have accepted this ticket. Inspecting the WebGL chart data parser. It seems large datasets with null values are triggering an unhandled context loss. Working on a fallback renderer.',
      timestamp: '2026-11-02 01:25 PM'
    },
    {
      id: 'msg-4',
      issueId: 'ISS-1002',
      senderId: 'EMP101',
      senderName: 'Surya',
      senderRole: 'Supporter',
      message: 'Thanks Arun! Let us know if you need us to replicate with the staging database dump.',
      timestamp: '2026-11-02 01:40 PM'
    }
  ],
  'ISS-1003': [
    {
      id: 'msg-5',
      issueId: 'ISS-1003',
      senderId: 'EMP101',
      senderName: 'Surya',
      senderRole: 'Supporter',
      message: 'Field technician replaced the patch cable, but switch port 10 is still registering intermittent link-state flaps.',
      timestamp: '2026-11-02 03:50 PM'
    },
    {
      id: 'msg-6',
      issueId: 'ISS-1003',
      senderId: 'EMP206',
      senderName: 'Kumar',
      senderRole: 'Developer',
      message: 'Accepted. I am reviewing the optical transceiver diagnostics (DDM/DOM) remotely. The optical receive power is at -21dBm, which is near the sensitivity boundary. Dispatching hardware team to clean optical ferrule.',
      timestamp: '2026-11-02 04:15 PM'
    }
  ],
  'ISS-1004': [
    {
      id: 'msg-7',
      issueId: 'ISS-1004',
      senderId: 'EMP101',
      senderName: 'Surya',
      senderRole: 'Supporter',
      message: 'Conveyor Bay 7 scanner is halted. Production line is temporarily routing to manual handheld scanners.',
      timestamp: '2026-10-31 09:25 AM'
    },
    {
      id: 'msg-8',
      issueId: 'ISS-1004',
      senderId: 'EMP205',
      senderName: 'Arun',
      senderRole: 'Developer',
      message: 'Flash-updated the scanner firmware to v4.12.8 with enlarged ring buffer. Testing with 500 test pallets.',
      timestamp: '2026-10-31 03:10 PM'
    },
    {
      id: 'msg-9',
      issueId: 'ISS-1004',
      senderId: 'EMP101',
      senderName: 'Surya',
      senderRole: 'Supporter',
      message: 'Verified 500 scans with zero dropped packets. Marking as resolved with your RCA.',
      timestamp: '2026-10-31 04:28 PM'
    }
  ]
};
