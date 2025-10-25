"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintableSOAPNote = PrintableSOAPNote;
function PrintableSOAPNote({ note, patient, clinicInfo, }) {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    return (<div className="printable-document page-break-avoid">
      {/* Print Header */}
      <div className="print-header">
        {clinicInfo && (<div className="mb-4">
            <h1 className="text-2xl font-bold">{clinicInfo.name}</h1>
            {clinicInfo.address && (<p className="text-sm text-gray-600">{clinicInfo.address}</p>)}
            {clinicInfo.phone && (<p className="text-sm text-gray-600">Tel: {clinicInfo.phone}</p>)}
          </div>)}

        <h2 className="text-xl font-bold mb-3">Nota Clínica - SOAP</h2>

        {/* Patient Information */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <strong>Paciente:</strong> {patient.firstName} {patient.lastName}
          </div>
          <div>
            <strong>MRN:</strong> <span className="font-mono">{patient.mrn}</span>
          </div>
          <div>
            <strong>Fecha de Nacimiento:</strong> {formatDate(patient.dateOfBirth)}{' '}
            ({calculateAge(patient.dateOfBirth)} años)
          </div>
          <div>
            <strong>Sexo:</strong>{' '}
            {patient.gender === 'male'
            ? 'Masculino'
            : patient.gender === 'female'
                ? 'Femenino'
                : 'Otro'}
          </div>
          {patient.tokenId && (<div>
              <strong>Token ID:</strong>{' '}
              <span className="font-mono">{patient.tokenId}</span>
            </div>)}
          <div>
            <strong>Fecha:</strong> {formatDate(note.createdAt)}
          </div>
          <div>
            <strong>Hora:</strong> {formatTime(note.createdAt)}
          </div>
          <div>
            <strong>Tipo de Nota:</strong> {note.type}
          </div>
        </div>

        {/* Clinician Information */}
        {note.author && (<div className="mt-3 pt-3 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-x-8 text-sm">
              <div>
                <strong>Médico:</strong> Dr. {note.author.firstName}{' '}
                {note.author.lastName}
              </div>
              {note.author.specialty && (<div>
                  <strong>Especialidad:</strong> {note.author.specialty}
                </div>)}
              {note.author.licenseNumber && (<div>
                  <strong>Cédula Profesional:</strong> {note.author.licenseNumber}
                </div>)}
            </div>
          </div>)}
      </div>

      {/* Vital Signs */}
      {note.vitalSigns && (<div className="soap-section page-break-avoid">
          <h2>Signos Vitales</h2>
          <div className="vital-signs-print">
            {note.vitalSigns.bloodPressure && (<div className="vital-row">
                <div className="vital-label">Presión Arterial</div>
                <div className="vital-value">
                  {note.vitalSigns.bloodPressure} mmHg
                </div>
              </div>)}
            {note.vitalSigns.heartRate && (<div className="vital-row">
                <div className="vital-label">Frecuencia Cardíaca</div>
                <div className="vital-value">{note.vitalSigns.heartRate} lpm</div>
              </div>)}
            {note.vitalSigns.temperature && (<div className="vital-row">
                <div className="vital-label">Temperatura</div>
                <div className="vital-value">{note.vitalSigns.temperature} °C</div>
              </div>)}
            {note.vitalSigns.respiratoryRate && (<div className="vital-row">
                <div className="vital-label">Frecuencia Respiratoria</div>
                <div className="vital-value">
                  {note.vitalSigns.respiratoryRate} rpm
                </div>
              </div>)}
            {note.vitalSigns.oxygenSaturation && (<div className="vital-row">
                <div className="vital-label">Saturación de Oxígeno</div>
                <div className="vital-value">
                  {note.vitalSigns.oxygenSaturation}%
                </div>
              </div>)}
            {note.vitalSigns.weight && (<div className="vital-row">
                <div className="vital-label">Peso</div>
                <div className="vital-value">{note.vitalSigns.weight} kg</div>
              </div>)}
          </div>
        </div>)}

      {/* SOAP Sections */}
      {note.subjective && (<div className="soap-section page-break-avoid">
          <h2>Subjetivo (S)</h2>
          <div className="content whitespace-pre-wrap">{note.subjective}</div>
        </div>)}

      {note.objective && (<div className="soap-section page-break-avoid">
          <h2>Objetivo (O)</h2>
          <div className="content whitespace-pre-wrap">{note.objective}</div>
        </div>)}

      {note.assessment && (<div className="soap-section page-break-avoid">
          <h2>Evaluación (A)</h2>
          <div className="content whitespace-pre-wrap">{note.assessment}</div>

          {/* Diagnoses */}
          {note.diagnoses && note.diagnoses.length > 0 && (<div className="mt-3">
              <strong className="block mb-2">Diagnósticos (ICD-10):</strong>
              <div className="code-list">
                {note.diagnoses.map((diagnosis, index) => (<div key={index} className="code-item mb-2">
                    <span className="font-bold">{diagnosis.code}</span> -{' '}
                    {diagnosis.description}
                  </div>))}
              </div>
            </div>)}
        </div>)}

      {note.plan && (<div className="soap-section page-break-avoid">
          <h2>Plan (P)</h2>
          <div className="content whitespace-pre-wrap">{note.plan}</div>

          {/* Procedures */}
          {note.procedures && note.procedures.length > 0 && (<div className="mt-3">
              <strong className="block mb-2">Procedimientos:</strong>
              <div className="code-list">
                {note.procedures.map((procedure, index) => (<div key={index} className="code-item mb-2">
                    <span className="font-bold">{procedure.code}</span> -{' '}
                    {procedure.description}
                  </div>))}
              </div>
            </div>)}
        </div>)}

      {/* Signature Section */}
      {note.author && (<div className="signature-section page-break-avoid">
          <div className="signature-line"></div>
          <div className="signature-label">
            Dr. {note.author.firstName} {note.author.lastName}
          </div>
          {note.author.licenseNumber && (<div className="signature-label">
              Cédula Profesional: {note.author.licenseNumber}
            </div>)}
        </div>)}

      {/* HIPAA Notice */}
      <div className="hipaa-notice page-break-avoid">
        <strong>AVISO DE PRIVACIDAD</strong>
        <p className="mt-1">
          Este documento contiene información médica confidencial protegida por
          leyes de privacidad. Su divulgación no autorizada está prohibida. Si no
          es el destinatario previsto, notifique al remitente y destruya este
          documento.
        </p>
      </div>

      {/* Print Footer */}
      <div className="print-footer print-only">
        Página <span className="page-number"></span> | Impreso:{' '}
        {new Date().toLocaleString('es-ES')} | ID: {note.id}
      </div>
    </div>);
}
//# sourceMappingURL=PrintableSOAPNote.js.map