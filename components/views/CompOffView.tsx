import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { GiftIcon, BellIcon } from "@/components/ui/icons";
import { COMP_OFF } from "@/lib/mock-data";
import type { EmployeeDirectoryEntry } from "@/components/views/EmployeeManagementView";

export function CompOffView({ employees }: { employees: EmployeeDirectoryEntry[] }) {
  const employeeIds = new Set(employees.map((employee) => employee.employeeId));
  const teamRecords = COMP_OFF.filter((record) => employeeIds.has(record.employeeId));
  const totalEarned = teamRecords.reduce((s, c) => s + c.earned, 0);
  const totalUsed = teamRecords.reduce((s, c) => s + c.used, 0);
  const totalBalance = teamRecords.reduce((s, c) => s + c.balance, 0);

  // Alert when an employee has unused roster duty off
  const alerts = teamRecords.filter((c) => c.balance > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Holiday Duties Worked"
          value={teamRecords.reduce((s, c) => s + c.holidayDutiesWorked, 0)}
          hint="Across the team"
          accentToken="rose"
          icon={<GiftIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Roster Duty Off Earned"
          value={totalEarned}
          hint={`${totalUsed} used so far`}
          accentToken="amber"
          icon={<GiftIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Unused Balance"
          value={totalBalance}
          hint="1 holiday duty = 1 day off"
          accentToken="emerald"
          icon={<GiftIcon className="h-5 w-5" />}
        />
      </div>

      {alerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <BellIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {alerts.length} employee{alerts.length !== 1 && "s"} have unused
              Roster Duty Off
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
              {alerts.map((a) => a.employeeName).join(", ")} — consider prompting
              them to apply.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader
          title="Roster Duty Off Tracker"
          subtitle="Holiday duty and compensatory off per employee"
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-3 py-3 text-center font-medium">
                  Holiday Duties
                </th>
                <th className="px-3 py-3 text-center font-medium">Earned</th>
                <th className="px-3 py-3 text-center font-medium">Used</th>
                <th className="px-3 py-3 text-center font-medium">Balance</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {teamRecords.map((c) => (
                <tr
                  key={c.employeeId}
                  className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={c.employeeInitials} size="sm" />
                      <div className="leading-tight">
                        <p className="font-medium text-zinc-800 dark:text-zinc-100">
                          {c.employeeName}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {c.department}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-zinc-600 dark:text-zinc-300">
                    {c.holidayDutiesWorked}
                  </td>
                  <td className="px-3 py-3 text-center text-zinc-600 dark:text-zinc-300">
                    {c.earned}
                  </td>
                  <td className="px-3 py-3 text-center text-zinc-600 dark:text-zinc-300">
                    {c.used}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-zinc-800 dark:text-zinc-100">
                    {c.balance}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.balance > 0 ? (
                      <Badge accentToken="amber">Unused off</Badge>
                    ) : (
                      <Badge accentToken="emerald">All settled</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {teamRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-400">
                    No roster duty-off records for your team.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
