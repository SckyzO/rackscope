# Rack Template Schema

Rack templates describe the frame dimensions and the built-in infrastructure components like PMC (Power) and HMC (Cooling).

## Schema Specification

```yaml
rack_templates:
  - id: string          # Unique identifier
    name: string        # Human-readable name
    u_height: integer   # Total height (typically 42 or 48)
    
    # Built-in infrastructure components
    infrastructure:
      components:
        - id: string
          name: string
          type: string  # power, cooling, management, network, other
          model: string # Descriptive model
          role: string  # active, backup, primary
          location: string # u-mount, side-left, side-right, top, bottom
          u_position: integer # Bottom-most U (if location is u-mount)
          u_height: integer   # Number of U occupied
```

## Usage Example: BullSequana XH3000
A DLC rack with 2 hydraulic controllers at the bottom and 1 power controller at the top.

```yaml
infrastructure:
  components:
    - id: hmc-01
      type: cooling
      location: u-mount
      u_position: 1
      u_height: 2
    - id: pmc-01
      type: power
      location: u-mount
      u_position: 48
      u_height: 1
```
