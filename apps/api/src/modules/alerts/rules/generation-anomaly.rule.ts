import { ALERT_RULE, generationAnomalyEnabled } from '../alert.constants';
import { AlertDecision, AlertEvaluationContext, MonitoringAlertRule } from '../alert.types';

/** Estrutura futura. Desabilitada até haver histórico/irradiância confiáveis. */
export class GenerationAnomalyRule implements MonitoringAlertRule {
  readonly code = ALERT_RULE.GENERATION_ANOMALY;

  evaluate(_context: AlertEvaluationContext): AlertDecision {
    if (!generationAnomalyEnabled()) return { action: 'skip' };
    return { action: 'skip' };
  }
}
