"use client"; // <-- Add this at the very top

import { useMemo, useState } from "react";
import { 
  Row, Col, Card, Statistic, Select, Input, Table, Tag, Space, Button, Typography, Modal, List, Avatar 
} from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ShoppingCartOutlined, CheckCircleOutlined, CarOutlined, ClockCircleOutlined, DollarCircleOutlined } from "@ant-design/icons";
import ordersData from "../data/orders.json";

const { Search } = Input;
const { Title } = Typography;
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28BFF"];

export default function Dashboard() {
  const [orders] = useState(Array.isArray(ordersData) ? ordersData : []);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    let delivered = 0, pending = 0, inTransit = 0;
    let revenue = 0;
    const ordersByDeliveryPerson = {};
    const itemCounts = {};

    orders.forEach(order => {
      const st = (order.Order_Status || "").toLowerCase();
      if (st.includes("delivered")) delivered++;
      else if (st.includes("pending")) pending++;
      else if (st.includes("in transit") || st.includes("in-transit") || st.includes("intransit")) inTransit++;

      if (Array.isArray(order.Items)) {
        order.Items.forEach(item => {
          const p = Number(item.Total_Price) || (Number(item.Item_Price) * (Number(item.Quantity) || 1)) || 0;
          revenue += p;
          const name = item.Item_Name || "Unknown";
          itemCounts[name] = (itemCounts[name] || 0) + (Number(item.Quantity) || 1);
        });
      }

      const dp = order.Delivery_Person || "Unassigned";
      ordersByDeliveryPerson[dp] = (ordersByDeliveryPerson[dp] || 0) + 1;
    });

    const topItems = Object.keys(itemCounts)
      .map(name => ({ name, count: itemCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const statusPie = [
      { name: "Delivered", value: delivered },
      { name: "In Transit", value: inTransit },
      { name: "Pending", value: pending },
    ];

    return { totalOrders, delivered, pending, inTransit, revenue, topItems, ordersByDeliveryPerson, statusPie };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== "All" && order.Order_Status !== statusFilter) return false;
      if (typeFilter !== "All" && order.Order_Type !== typeFilter) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const matchId = String(order.Order_ID).toLowerCase().includes(q);
        const matchName = (order.Customer_Name || "").toLowerCase().includes(q);
        const matchPhone = (order.Customer_Phone || "").toLowerCase().includes(q);
        if (!(matchId || matchName || matchPhone)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, typeFilter, searchText]);

  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  const statusOptions = useMemo(() => {
    const s = new Set(["All"]);
    orders.forEach(o => { if (o.Order_Status) s.add(o.Order_Status); });
    return Array.from(s);
  }, [orders]);

  const typeOptions = useMemo(() => {
    const s = new Set(["All"]);
    orders.forEach(o => { if (o.Order_Type) s.add(o.Order_Type); });
    return Array.from(s);
  }, [orders]);

  const columns = [
    { title: "Order ID", dataIndex: "Order_ID", key: "Order_ID", sorter: (a,b) => a.Order_ID - b.Order_ID, render: id => <b>{id}</b> },
    { title: "Customer", dataIndex: "Customer_Name", key: "Customer_Name" },
    { title: "Phone", dataIndex: "Customer_Phone", key: "Customer_Phone" },
    { title: "Type", dataIndex: "Order_Type", key: "Order_Type", filters: [{text:"Online", value:"Online"},{text:"Dine In", value:"Dine In"}], onFilter: (value, record) => record.Order_Type===value },
    { title: "Status", dataIndex: "Order_Status", key: "Order_Status",
      render: (status) => {
        let color="default"; if(!status){color="gray";status="Unassigned";}
        else if(status.toLowerCase().includes("delivered")) color="green";
        else if(status.toLowerCase().includes("in transit")) color="orange";
        else if(status.toLowerCase().includes("pending")) color="red";
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: "Delivery Person", dataIndex: "Delivery_Person", key: "Delivery_Person", render: text => text||<i>Unassigned</i> },
    { title: "Revenue (Order)", key:"orderRevenue", render: (_,record)=>{ 
        const sum = (Array.isArray(record.Items)?record.Items.reduce((acc,it)=>acc+(Number(it.Total_Price)||0),0):0);
        return <b>${sum.toFixed(2)}</b>;
      }, sorter: (a,b)=>((Array.isArray(a.Items)?a.Items.reduce((acc,it)=>acc+(Number(it.Total_Price)||0),0):0) - (Array.isArray(b.Items)?b.Items.reduce((acc,it)=>acc+(Number(it.Total_Price)||0),0):0))
    },
    { title: "Actions", key:"actions", render: (_, record)=>(<Space><Button className="bg-cyan-400 text-white" size="small" onClick={()=>showOrderDetails(record)}>View</Button></Space>) }
  ];

  return (
    <div className="min-h-screen p-5 bg-gradient-to-r from-pink-200 via-blue-100 to-purple-200 animate-gradient-x">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders Dashboard</h1>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <Statistic title="Total Orders" value={metrics.totalOrders} prefix={<ShoppingCartOutlined className="text-blue-500"/>}/>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <Statistic title="Delivered" value={metrics.delivered} valueStyle={{ color: "green" }} prefix={<CheckCircleOutlined className="text-green-500"/>}/>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <Statistic title="In Transit" value={metrics.inTransit} valueStyle={{ color: "#1890ff" }} prefix={<CarOutlined className="text-blue-500"/>}/>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <Statistic title="Pending" value={metrics.pending} valueStyle={{ color: "orange" }} prefix={<ClockCircleOutlined className="text-orange-500"/>}/>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <Statistic title="Total Revenue" value={`$${metrics.revenue.toFixed(2)}`} valueStyle={{ color: "goldenrod" }} prefix={<DollarCircleOutlined className="text-yellow-500"/>}/>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">Order Status Breakdown</h2>
         <ResponsiveContainer width="100%" height={240}>
  <PieChart>
    <Pie 
      data={metrics.statusPie} 
      dataKey="value" 
      nameKey="name" 
      cx="50%" 
      cy="50%" 
      outerRadius={80} 
      label
    >
      {metrics.statusPie.map((entry, index) => (
        <Cell key={index} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Tooltip />
    <Legend
      layout="vertical"       // vertical list
      verticalAlign="middle"  // center vertically
      align="right"           // position on the right side
      iconSize={15}
    />
  </PieChart>
</ResponsiveContainer>

        </div>
        <div className="col-span-2 bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">Top Ordered Items</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics.topItems}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0}/>
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Quantity">
                {metrics.topItems.map((entry,idx)=><Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between mb-4">
          <Space>
            <Select value={typeFilter} onChange={setTypeFilter} style={{width:140}}>
              {typeOptions.map(t=> <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
            <Select value={statusFilter} onChange={setStatusFilter} style={{width:160}}>
              {statusOptions.map(s=> <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Space>
          <Space>
            <Search placeholder="Search by Order ID / Customer / Phone" value={searchText} onChange={e=>setSearchText(e.target.value)} style={{width:320}} allowClear/>
            <Button onClick={()=>{setStatusFilter("All"); setTypeFilter("All"); setSearchText("");}}>Reset</Button>
          </Space>
        </div>
        <Table columns={columns} dataSource={filteredOrders.map(o=>({...o,key:o.Order_ID}))} pagination={{ pageSize:10 }} bordered size="middle"/>
      </div>

      {/* Modal */}
      <Modal title={`Order Details - #${selectedOrder?.Order_ID}`} open={isModalVisible} onCancel={()=>setIsModalVisible(false)} footer={null} width={600}>
        {selectedOrder && (
          <div>
            <p><b>Customer:</b> {selectedOrder.Customer_Name}</p>
            <p><b>Phone:</b> {selectedOrder.Customer_Phone}</p>
            <p><b>Address:</b> {selectedOrder.Customer_Address}</p>
            <p><b>Delivery Person:</b> {selectedOrder.Delivery_Person||"Unassigned"}</p>
            <p><b>Status:</b> {selectedOrder.Order_Status}</p>
            <h4 className="font-bold mt-2">Items:</h4>
            <List dataSource={selectedOrder.Items||[]} renderItem={item=>(
              <List.Item>
                <List.Item.Meta avatar={<Avatar src={item.Image_URL} shape="square"/>} title={`${item.Item_Name} x ${item.Quantity}`} description={`$${item.Total_Price}`}/>
              </List.Item>
            )}/>
          </div>
        )}
      </Modal>
    </div>
  );
}
