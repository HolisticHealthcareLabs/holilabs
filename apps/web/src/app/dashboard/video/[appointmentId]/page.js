"use strict";
/**
 * Clinician Video Call Page
 *
 * Beautiful, simple telemedicine interface for clinicians
 */
'use client';
/**
 * Clinician Video Call Page
 *
 * Beautiful, simple telemedicine interface for clinicians
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ClinicianVideoCallPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const WaitingRoom_1 = __importDefault(require("@/components/video/WaitingRoom"));
const VideoRoom_1 = __importDefault(require("@/components/video/VideoRoom"));
function ClinicianVideoCallPage({ params, }) {
    const [isInCall, setIsInCall] = (0, react_1.useState)(false);
    const router = (0, navigation_1.useRouter)();
    // Mock data - replace with actual data fetching
    const userName = 'Dr. García';
    const appointmentTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    const handleJoinCall = () => {
        setIsInCall(true);
    };
    const handleLeaveCall = () => {
        setIsInCall(false);
        router.push('/dashboard/appointments');
    };
    if (isInCall) {
        return (<VideoRoom_1.default roomId={params.appointmentId} userName={userName} userType="clinician" onLeave={handleLeaveCall}/>);
    }
    return (<WaitingRoom_1.default userName={userName} userType="clinician" appointmentTime={appointmentTime} onJoinCall={handleJoinCall}/>);
}
//# sourceMappingURL=page.js.map