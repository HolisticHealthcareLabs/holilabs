"use strict";
/**
 * Patient Video Call Page
 *
 * Beautiful, simple telemedicine interface for patients
 */
'use client';
/**
 * Patient Video Call Page
 *
 * Beautiful, simple telemedicine interface for patients
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PatientVideoCallPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const WaitingRoom_1 = __importDefault(require("@/components/video/WaitingRoom"));
const VideoRoom_1 = __importDefault(require("@/components/video/VideoRoom"));
function PatientVideoCallPage({ params, }) {
    const [isInCall, setIsInCall] = (0, react_1.useState)(false);
    const router = (0, navigation_1.useRouter)();
    // Mock data - replace with actual data fetching
    const userName = 'María González';
    const appointmentTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    const handleJoinCall = () => {
        setIsInCall(true);
    };
    const handleLeaveCall = () => {
        setIsInCall(false);
        router.push('/portal/appointments');
    };
    if (isInCall) {
        return (<VideoRoom_1.default roomId={params.appointmentId} userName={userName} userType="patient" onLeave={handleLeaveCall}/>);
    }
    return (<WaitingRoom_1.default userName={userName} userType="patient" appointmentTime={appointmentTime} onJoinCall={handleJoinCall}/>);
}
//# sourceMappingURL=page.js.map