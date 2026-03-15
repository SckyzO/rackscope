"""Label template resolution for Prometheus metric emission.

Labels in metric definitions can reference topology context tokens
using the $ prefix (e.g. "$instance", "$rack_id").
"""


def _resolve_token(value, base_labels, context):
    """Resolve a single label template token against context + base labels.

    A value starting with "$" is a template: the token after "$" is looked up
    first in context, then in base_labels. Non-string values are passed through.
    """
    if not isinstance(value, str):
        return value
    if not value.startswith("$"):
        return value
    token = value[1:]
    if token in context:
        return context[token]
    return base_labels.get(token, "")


def resolve_labels(definition, base_labels, context):
    """Build the Prometheus label dict for a metric emission.

    By default, base_labels are included. Setting labels_only=True or
    include_base_labels=False in the metric definition strips them.
    """
    if definition.get("labels_only") or definition.get("include_base_labels") is False:
        labels = {}
    else:
        labels = dict(base_labels)
    for key, template in (definition.get("labels") or {}).items():
        labels[key] = _resolve_token(template, base_labels, context)
    return labels
