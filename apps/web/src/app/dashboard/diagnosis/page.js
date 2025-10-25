"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = DiagnosisPage;
const DiagnosisAssistant_1 = __importDefault(require("@/components/clinical/DiagnosisAssistant"));
exports.metadata = {
    title: 'AI Diagnosis Assistant | Holi Labs',
    description: 'Clinical decision support system powered by AI',
};
function DiagnosisPage() {
    return <DiagnosisAssistant_1.default />;
}
//# sourceMappingURL=page.js.map