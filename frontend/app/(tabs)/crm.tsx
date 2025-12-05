import React from 'react';
import { Redirect } from 'expo-router';

// This file acts as the CRM tab entry point
// It redirects to the main CRM leads screen
export default function CRMTab() {
  return <Redirect href="/crm" />;
}
