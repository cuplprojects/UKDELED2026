<%@ Page Language="C#" AutoEventWireup="true" CodeFile="pmtProcess.aspx.cs" Inherits="test" %>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
<title>Payment Processing</title>
<link href="<%= ResolveUrl("~/images/style.css?v=14") %>" rel="stylesheet" type="text/css" />
</head>
<body><form id="form1" runat="server">
<!-- header--><div class="header" style="border-bottom:2px #000 solid;">
<div class="logo"><a href="<%= ResolveUrl("~/default.aspx") %>"><img src="<%= ResolveUrl("~/images/ubse_yellow.jpg") %>" /></a></div>
<div class="title"><img src="<%= ResolveUrl("~/images/headernew.png?v=18") %>" /></div>
<div class="helpline"><img src="<%= ResolveUrl("~/images/underdevelopmentlogo.jpg?v=18") %>" /></div>
</div><!-- header-->

<div runat="server" id="div_success" class="landing_page"><img src="../images/spinner.gif" /><p>Processing Payment !<br />Please Do not close and Refresh Browser</p></div>
<div runat="server" id="div_error" visible="false" class="landing_page"><img src="../images/failed.jpg" /><p></p></div>
<div style="text-align:center; font-size:20px; color:red;"><asp:Label ID="lblMessage" runat="server"></asp:Label></div>

<asp:Label ID="lbsign" runat="server"></asp:Label>

</form></html>
