import { ALERT_RULE, RULE_SEVERITY, RULE_TITLE } from '../alert.constants';
import { AlertDecision, AlertEvaluationContext, MonitoringAlertRule } from '../alert.types';

function describe(context: AlertEvaluationContext, suffix: string) {
  const when = (context.collectedAt ?? context.now ?? new Date()).toISOString();
  return `${context.plantName || 'Usina'} / ${context.inverterName || context.inverterId}: ${suffix} em ${when}.`;
}

export class InverterOfflineRule implements MonitoringAlertRule {
  readonly code = ALERT_RULE.INVERTER_OFFLINE;

  evaluate(context: AlertEvaluationContext): AlertDecision {
    if (context.collectability !== 'COLLECTABLE' || !context.readingValid || !context.status) return { action: 'skip' };
    if (context.status === 'OFFLINE') {
      return {
        action: 'open',
        ruleCode: this.code,
        severity: RULE_SEVERITY[this.code],
        title: RULE_TITLE[this.code],
        description: describe(context, 'inversor offline'),
      };
    }
    return { action: 'resolve', ruleCode: this.code };
  }
}

export class InverterWarningRule implements MonitoringAlertRule {
  readonly code = ALERT_RULE.INVERTER_WARNING;

  evaluate(context: AlertEvaluationContext): AlertDecision {
    if (context.collectability !== 'COLLECTABLE' || !context.readingValid || !context.status) return { action: 'skip' };
    if (context.status === 'WARNING') {
      return {
        action: 'open',
        ruleCode: this.code,
        severity: RULE_SEVERITY[this.code],
        title: RULE_TITLE[this.code],
        description: describe(context, 'inversor em atenção'),
      };
    }
    return { action: 'resolve', ruleCode: this.code };
  }
}

export class InverterErrorRule implements MonitoringAlertRule {
  readonly code = ALERT_RULE.INVERTER_ERROR;

  evaluate(context: AlertEvaluationContext): AlertDecision {
    if (context.collectability !== 'COLLECTABLE' || !context.readingValid || !context.status) return { action: 'skip' };
    if (context.status === 'ERROR') {
      return {
        action: 'open',
        ruleCode: this.code,
        severity: RULE_SEVERITY[this.code],
        title: RULE_TITLE[this.code],
        description: describe(context, 'inversor em erro'),
      };
    }
    return { action: 'resolve', ruleCode: this.code };
  }
}
