import {
	AreaChart,
	Area,
	Tooltip,
	CartesianGrid,
	ResponsiveContainer,
} from "recharts";
import colors from "web-check-live/styles/colors";
import { Card } from "web-check-live/components/Form/Card";
import Row from "web-check-live/components/Form/Row";

const cardStyles = `
span.val {
  &.up { color: ${colors.success}; }
  &.down { color: ${colors.danger}; }
}
.rank-average {
  text-align: center;
  font-size: 1.8rem;
  font-weight: bold;
}
.chart-container {
  margin-top: 1rem;
}
`;

const makeRankStats = (data: { date: string; rank: number }[]) => {
	if (data.length === 0) {
		return {
			average: null,
			percentageChange: null,
		};
	}

	const average = Math.round(
		data.reduce((acc, cur) => acc + cur.rank, 0) / data.length,
	);

	if (data.length < 2) {
		return {
			average,
			percentageChange: null,
		};
	}

	const today = data[0].rank;
	const yesterday = data[1].rank;
	const percentageChange = ((today - yesterday) / yesterday) * 100;
	return {
		average,
		percentageChange,
	};
};

const makeChartData = (data: { date: string; rank: number }[]) => {
	return data.map((d) => {
		return {
			date: d.date,
			uv: d.rank,
		};
	});
};

const normalizeRanks = (ranks: any[]) => {
	return ranks
		.map((entry) => {
			const rankValue =
				typeof entry?.rank === "number"
					? entry.rank
					: Number.parseInt(entry?.rank, 10);
			if (!Number.isFinite(rankValue)) {
				return null;
			}
			return {
				date: entry?.date || "",
				rank: rankValue,
			};
		})
		.filter((entry): entry is { date: string; rank: number } => Boolean(entry));
};

function Chart(chartData: { date: string; uv: number }[], data: any) {
	return (
		<ResponsiveContainer width="100%" height={100}>
			<AreaChart width={400} height={100} data={chartData}>
				<defs>
					<linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
						<stop offset="20%" stopColor="#0f1620" stopOpacity={0.8} />
						<stop offset="80%" stopColor="#0f1620" stopOpacity={0} />
					</linearGradient>
				</defs>
				<CartesianGrid
					strokeDasharray="4"
					strokeWidth={0.25}
					verticalPoints={[50, 100, 150, 200, 250, 300, 350]}
					horizontalPoints={[25, 50, 75]}
				/>
				<Tooltip
					contentStyle={{
						background: colors.background,
						color: colors.textColor,
						borderRadius: 4,
					}}
					labelFormatter={(value) => ["Date : ", data[value].date]}
				/>
				<Area
					type="monotone"
					dataKey="uv"
					stroke="#9fef00"
					fillOpacity={1}
					name="Rank"
					fill={`${colors.backgroundDarker}a1`}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}

const RankCard = (props: {
	data: any;
	title: string;
	actionButtons: any;
}): JSX.Element => {
	const rawRanks = Array.isArray(props.data.ranks) ? props.data.ranks : [];
	const data = normalizeRanks(rawRanks);
	const { average, percentageChange } = makeRankStats(data);
	const chartData = makeChartData(data);
	const latestRank = data[0]?.rank;
	const skippedMessage = props.data.skipped;
	return (
		<Card
			heading={props.title}
			actionButtons={props.actionButtons}
			styles={cardStyles}
		>
			<div className="rank-average">
				{latestRank ? latestRank.toLocaleString() : "No ranking data"}
			</div>
			{skippedMessage && <p>{skippedMessage}</p>}
			<Row
				lbl="Change since Yesterday"
				val={
					percentageChange === null
						? "N/A"
						: `${percentageChange > 0 ? "+" : ""} ${percentageChange.toFixed(2)}%`
				}
			/>
			<Row
				lbl="Historical Average Rank"
				val={average === null ? "N/A" : average.toLocaleString()}
			/>
			{data.length > 0 && (
				<div className="chart-container">{Chart(chartData, data)}</div>
			)}
		</Card>
	);
};

export default RankCard;
