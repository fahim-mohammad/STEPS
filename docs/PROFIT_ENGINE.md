# Profit Engine (v1)

1) Sum approved contributions per member.
2) Compute each member share = contribution / total_contribution.
3) Read total investment profit for period.
4) Allocate profit proportionally to share.
5) Reduce allocation for outstanding loans.
6) Insert rows into profit_distributions(user_id, period, amount).
7) Emit audit log + email notice.
