import { ALERT_RULE, RULE_SEVERITY, RULE_TITLE, noReadingThresholdSeconds } from '../alert.constants';
import { AlertDecision, AlertEvaluationContext, MonitoringAlertRule } from '../alert.types';

export class NoRecentReadingRule implements MonitoringAlertRule {
  readonly code = ALERT_RULE.NO_RECENT_READING;

  evaluate(context: AlertEvaluationContext): AlertDecision {
    if (context.collectability !== 'COLLECTABLE') return { action: 'skip' };
    const now = context.now ?? new Date();
    const last = context.lastReadingAt;
    const thresholdMs = noReadingThresholdSeconds() * 1000;
    if (last && now.getTime() - last.getTime() <= thresholdMs) {
      return { action: 'resolve', ruleCode: this.code };
    }
    if (!last || now.getTime() - last.getTime() > thresholdMs) {
      return {
        action: 'open',
        ruleCode: this.code,
        severity: RULE_SEVERITY[this.code],
        title: RULE_TITLE[this.code],
        description: `${context.plantName || 'Usina'} / ${context.inverterName || context.inverterId}: sem leitura recente acima de ${noReadingThresholdSeconds()} segundos.`,
      };
    }
    return { action: 'skip' };
  }
}
