import React from 'react';
import { BodyMeasurements, CameraSettings, CapturedAngleFrame } from '../types';
import { LiveCamera360 } from './LiveCamera360';

interface LiveCameraProps {
  onCaptureComplete: (capturedData: {
    imageBase64: string;
    measurements: BodyMeasurements;
    capturedFrames?: CapturedAngleFrame[];
    customerName?: string;
    customerId?: string;
  }) => void;
  cameraSettings: CameraSettings;
  referenceHeightCm: number;
  initialCustomerName?: string;
  initialCustomerId?: string;
  existingCustomers?: Array<{ id: string; name: string }>;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({
  onCaptureComplete,
  cameraSettings,
  referenceHeightCm,
  initialCustomerName,
  initialCustomerId,
  existingCustomers
}) => {
  return (
    <LiveCamera360
      onScanComplete={(result) => {
        onCaptureComplete({
          imageBase64: result.imageBase64,
          measurements: result.measurements,
          capturedFrames: result.capturedFrames,
          customerName: result.customerName,
          customerId: result.customerId
        });
      }}
      cameraSettings={cameraSettings}
      referenceHeightCm={referenceHeightCm}
      initialCustomerName={initialCustomerName}
      initialCustomerId={initialCustomerId}
      existingCustomers={existingCustomers}
    />
  );
};
