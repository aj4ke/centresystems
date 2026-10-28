def _normalize(value):
    return ",".join(sorted(str(value).split(",")))


def pve_config_drift(current, desired):
    args = []
    for key, value in desired.items():
        if _normalize(current.get(key, "")) != _normalize(value):
            args += ["--" + key, str(value)]
    return args


class FilterModule:
    def filters(self):
        return {"pve_config_drift": pve_config_drift}
