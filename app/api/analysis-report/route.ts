import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const guard = requireRole(session, ["ANALYST", "ADMIN"]);
    if (!guard.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const shipmentId = searchParams.get('shipmentId');
    const alertId = searchParams.get('alertId');

    if (!shipmentId && !alertId) {
      return NextResponse.json({ error: "shipmentId or alertId required" }, { status: 400 });
    }

    // Get the alert and related shipment data
    let alert;
    let shipment;

    if (alertId) {
      alert = await prisma.alert.findUnique({
        where: { id: alertId }
      });
      if (alert) {
        shipment = await prisma.shipment.findFirst({
          where: { routeId: alert.shipmentId },
          select: ({
            routeId: true,
            driverName: true,
            expectedETA: true,
            actualETA: true,
            routeStatus: true,
            origin: true,
            destination: true,
            gpsOnline: true,
            lastKnownAt: true,
            lastKnownLat: true,
            lastKnownLng: true,
            speedKph: true,
            headingDeg: true,
            createdAt: true,
            id: true,
            // Cargo
            cargoName: true,
            cargoQuantity: true,
            cargoUnitCost: true,
            cargoTotalValue: true,
          } as any)
        });
      }
    } else if (shipmentId) {
      alert = await prisma.alert.findFirst({
        where: { shipmentId },
        orderBy: { createdAt: 'desc' }
      });
      shipment = await prisma.shipment.findFirst({
        where: { routeId: shipmentId },
        select: ({
          routeId: true,
          driverName: true,
          expectedETA: true,
          actualETA: true,
          routeStatus: true,
          origin: true,
          destination: true,
          gpsOnline: true,
          lastKnownAt: true,
          lastKnownLat: true,
          lastKnownLng: true,
          speedKph: true,
          headingDeg: true,
          createdAt: true,
          id: true,
          // Cargo
          cargoName: true,
          cargoQuantity: true,
          cargoUnitCost: true,
          cargoTotalValue: true,
        } as any)
      });
    }

    if (!alert || !shipment) {
      return NextResponse.json({ error: "Alert or shipment not found" }, { status: 404 });
    }

    // Generate comprehensive analysis report
  const expectedTime = new Date((shipment as any).expectedETA).getTime();
  const actualTime = (shipment as any).actualETA ? new Date((shipment as any).actualETA).getTime() : Date.now();
    const delayMinutes = (actualTime - expectedTime) / (1000 * 60);
    
    const report = {
      reportId: `RPT-${Date.now()}`,
      generatedAt: new Date(),
      
      // Executive Summary
      executiveSummary: {
        threatLevel: alert.severity.toUpperCase(),
        riskAssessment: `${alert.severity === 'high' ? 'CRITICAL' : alert.severity === 'medium' ? 'ELEVATED' : 'MODERATE'} security risk detected`,
        primaryThreat: alert.type,
        impactAssessment: delayMinutes > 60 ? "HIGH - Significant operational disruption" : "MEDIUM - Operational impact contained"
      },

      // Incident Details
      incidentDetails: {
        shipmentId: (shipment as any).routeId,
        driverName: (shipment as any).driverName,
        detectionTime: alert.createdAt,
        expectedETA: (shipment as any).expectedETA,
        actualETA: (shipment as any).actualETA,
        delayMinutes: Math.round(delayMinutes),
        currentStatus: (shipment as any).routeStatus,
        cargo: (shipment as any).cargoName ? {
          name: (shipment as any).cargoName,
          quantity: (shipment as any).cargoQuantity,
          unitCost: (shipment as any).cargoUnitCost,
          estimatedValue: (shipment as any).cargoTotalValue
        } : null
      },

      // Threat Analysis
      threatAnalysis: {
        alertType: alert.type,
        description: alert.description,
        severity: alert.severity,
  indicators: generateThreatIndicators(alert.type, delayMinutes, shipment as any),
        potentialCauses: generatePotentialCauses(alert.type),
        riskFactors: generateRiskFactors(alert.type, delayMinutes)
      },

      // Security Recommendations
      recommendations: {
        immediate: generateImmediateActions(alert.severity, alert.type),
        shortTerm: generateShortTermActions(alert.type),
        longTerm: generateLongTermActions(),
        preventive: generatePreventiveMeasures(alert.type)
      },

      // Recovery Actions
      recoveryPlan: {
        containment: generateContainmentActions(alert.type),
        investigation: generateInvestigationSteps(),
        communication: generateCommunicationPlan(alert.severity),
        monitoring: generateMonitoringActions()
      },

      // Compliance & Documentation
      compliance: {
        regulatoryRequirements: generateComplianceRequirements(alert.severity),
        documentationNeeded: [
          "Incident response log",
          "Driver verification records", 
          "GPS tracking data",
          "Security camera footage",
          "Communication records"
        ],
        reportingObligation: alert.severity === 'high' ? "Immediate notification required" : "Standard reporting protocol"
      }
    };

    return NextResponse.json(report);

  } catch (error) {
    console.error("Analysis report generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate analysis report" },
      { status: 500 }
    );
  }
}

// Helper functions to generate report sections
interface ShipmentLite { routeId: string; driverName: string; expectedETA: Date; actualETA: Date | null; routeStatus: string }
function generateThreatIndicators(alertType: string, delayMinutes: number, shipment: ShipmentLite) {
  const indicators = [];
  
  if (delayMinutes > 30) indicators.push(`Significant delay: ${Math.round(delayMinutes)} minutes`);
  if (alertType.includes('Route')) indicators.push('GPS deviation patterns detected');
  if (alertType.includes('ETA')) indicators.push('Timeline manipulation suspected');
  if (alertType.includes('Cyber')) indicators.push('Data anomaly patterns identified');
  if (alertType.includes('Driver')) indicators.push('Authentication irregularities');
  
  return indicators;
}

function generatePotentialCauses(alertType: string) {
  const causes = {
    'Route Manipulation': ['GPS spoofing attack', 'Unauthorized route change', 'Driver coercion', 'Navigation system compromise'],
    'ETA Manipulation': ['Time fraud scheme', 'Driver-shipper collusion', 'System clock tampering', 'False reporting'],
    'Cargo Tampering': ['Theft attempt', 'Unauthorized inspection', 'Quality control bypass', 'Security breach'],
    'Cyber Attack': ['Malware infection', 'Data injection attack', 'System penetration', 'API exploitation'],
    'Driver Impersonation': ['Credential theft', 'Identity fraud', 'Insider threat', 'Authentication bypass']
  };
  
  return causes[alertType as keyof typeof causes] || ['Unknown threat vector', 'Requires investigation'];
}

function generateRiskFactors(alertType: string, delayMinutes: number) {
  const factors = ['High-value cargo exposure'];
  
  if (delayMinutes > 60) factors.push('Extended vulnerability window');
  if (alertType.includes('Cyber')) factors.push('System integrity compromise');
  if (alertType.includes('Driver')) factors.push('Human factor vulnerability');
  
  return factors;
}

function generateImmediateActions(severity: string, alertType: string) {
  const actions = ['Verify driver identity and status'];
  
  if (severity === 'high') {
    actions.push('Contact driver immediately');
    actions.push('Deploy security team');
    actions.push('Notify law enforcement');
  }
  
  if (alertType.includes('Cyber')) {
    actions.push('Isolate affected systems');
    actions.push('Initiate cyber incident response');
  }
  
  return actions;
}

function generateShortTermActions(alertType: string) {
  return [
    'Complete forensic analysis',
    'Review security footage',
    'Interview involved personnel',
    'Assess cargo integrity',
    'Update security protocols'
  ];
}

function generateLongTermActions() {
  return [
    'Enhance monitoring systems',
    'Implement additional authentication',
    'Review vendor relationships',
    'Update training programs',
    'Strengthen cybersecurity defenses'
  ];
}

function generatePreventiveMeasures(alertType: string) {
  const measures = ['Regular security audits', 'Employee background checks'];
  
  if (alertType.includes('Route')) measures.push('GPS tampering detection');
  if (alertType.includes('Cyber')) measures.push('Network segmentation');
  
  return measures;
}

function generateContainmentActions(alertType: string) {
  return [
    'Secure shipment location',
    'Establish communication',
    'Implement emergency protocols',
    'Coordinate with authorities'
  ];
}

function generateInvestigationSteps() {
  return [
    'Collect digital evidence',
    'Interview witnesses',
    'Analyze system logs',
    'Review procedures',
    'Document findings'
  ];
}

function generateCommunicationPlan(severity: string) {
  return {
    internal: 'Notify management and security team',
    external: severity === 'high' ? 'Customer notification required' : 'Standard reporting',
    authorities: severity === 'high' ? 'Law enforcement contact' : 'Regulatory filing',
    timeline: '4-hour notification window'
  };
}

function generateMonitoringActions() {
  return [
    'Continuous GPS tracking',
    'Enhanced communication checks',
    'Real-time threat monitoring',
    'Automated alert systems'
  ];
}

function generateComplianceRequirements(severity: string) {
  const requirements = ['Document incident response'];
  
  if (severity === 'high') {
    requirements.push('Regulatory notification within 24 hours');
    requirements.push('Third-party security audit');
  }
  
  return requirements;
}